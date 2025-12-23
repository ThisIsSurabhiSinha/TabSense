// Extract readable content/text from tabs

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__TAB_SENSE_LOADED) return;
  window.__TAB_SENSE_LOADED = true;

  // Ensuring Readability.js is loaded before extraction (important)
  function ensureReadabilityLoaded(callback) {
    if (typeof Readability !== 'undefined') {
      callback();
      return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('Readability.js');
    script.onload = callback;
    script.onerror = callback; // Continue even if Readability fails
    document.documentElement.appendChild(script);
  }

  // Extract main content from page
  function extractPageInfo() {
    try {
      if (typeof Readability !== 'undefined') {
        const cloned = document.cloneNode(true);
        const article = new Readability(cloned).parse();

        if (article?.textContent?.trim().length > 300) {
          return {
            title: article.title || document.title,
            snippet: article.textContent.trim(),
            url: window.location.href
          };
        }
      }
    } catch (error) {
      console.warn('Readability parse failed:', error);
    }

    // Fallback: Get main content area
    const mainNode = document.querySelector('main, article, [role="main"], section')
      || getLargestTextBlock(document.body);

    const text = mainNode?.innerText || document.body.innerText || '';

    return {
      title: document.title,
      snippet: text.trim(),
      url: window.location.href
    };
  }

  // Finding the element with the more text
  // (best possible way to get the main content of the page)
  function getLargestTextBlock(root) {
    if (!root) return null;

    let maxNode = null;
    let maxLen = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    while (walker.nextNode()) {
      const el = walker.currentNode;
      const text = el.innerText;

      if (text && text.length > maxLen) {
        maxLen = text.length;
        maxNode = el;
      }
    }

    return maxNode;
  }

  // Run extraction and then signal background.js for the next processes
  function runExtractor() {
    const result = extractPageInfo();
    chrome.runtime.sendMessage({
      type: 'TAB_SENSE_CONTENT_UPDATED',
      data: result
    }).catch(() => {});
  }

  // Message Listener

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === 'EXTRACT_PAGE_INFO') {
      sendResponse(extractPageInfo());
    }
    return true;
  });

  // MutationObserver for dynamic content

  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runExtractor, 800);
  });

  // Initialize
  ensureReadabilityLoaded(() => {
    // Initial extraction
    runExtractor();

    // Observing DOM changes
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  });

})();