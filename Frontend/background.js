// background.js
// TabSense — Background Orchestrator (MV3 safe)

import { summarizeAndExtract } from './summarizer.js';

const BACKEND_URL = 'http://localhost:8000/add_tab';
const SUMMARY_CHAR_LIMIT = 2000;
const MIN_TEXT_LENGTH = 80;
const PROCESS_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// Track last-processed time per tab to avoid duplicates
const lastProcessed = new Map();

// --------------------------------------------------
// Utility: Clean extracted text
// --------------------------------------------------
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

// --------------------------------------------------
// Send processed tab to backend KG service
// --------------------------------------------------
async function sendToBackend(payload) {
  try {
    await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('❌ Backend unreachable:', err.message);
  }
}

// --------------------------------------------------
// Main extraction + processing pipeline
// --------------------------------------------------
async function processTab(tabId) {
  try {
    const now = Date.now();
    const lastTime = lastProcessed.get(tabId);

    // Cooldown guard
    if (lastTime && now - lastTime < PROCESS_COOLDOWN_MS) {
      return;
    }

    const resp = await chrome.tabs.sendMessage(tabId, 'EXTRACT_PAGE_INFO');
    if (!resp || !resp.snippet) return;

    const cleanedText = cleanText(resp.snippet);
    if (cleanedText.length < MIN_TEXT_LENGTH) return;

    // Truncate for cost control
    const truncatedText = cleanedText.slice(0, SUMMARY_CHAR_LIMIT);

    // NLP summarization + entity extraction
    const aiResult = await summarizeAndExtract(truncatedText, resp.title || '');

    const tabPayload = {
  title: resp.title || 'Untitled',
  url: resp.url || '',
  summary: aiResult.summary || '',
  raw_text: truncatedText,
  entities: aiResult.entities || [],
  timestamp: now
};


    // Persist locally for UI summaries
    const stored = await chrome.storage.local.get('tabSense_data');
    const data = stored.tabSense_data || {};

    data[tabId] = tabPayload;
    await chrome.storage.local.set({ tabSense_data: data });

    // Send to backend KG
    await sendToBackend(tabPayload);

    lastProcessed.set(tabId, now);

    console.log(`✅ TabSense processed tab ${tabId}`);

  } catch (err) {
    // Handle missing content script
    if (err.message?.includes('Receiving end does not exist')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        setTimeout(() => processTab(tabId), 700);
      } catch (e) {
        console.warn('❌ Failed to inject content script:', e.message);
      }
    } else {
      console.warn('❌ Tab processing error:', err.message);
    }
  }
}

// --------------------------------------------------
// Retry wrapper (for SPA / late-loaded content)
// --------------------------------------------------
async function processWithRetry(tabId, retries = 2, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    await processTab(tabId);
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// --------------------------------------------------
// Event listeners
// --------------------------------------------------

// 1. Tab load completed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    processWithRetry(tabId);
  }
});

// 2. User activates a tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  processWithRetry(tabId);
});

// 3. Tab closed → cleanup
chrome.tabs.onRemoved.addListener(async (tabId) => {
  lastProcessed.delete(tabId);

  const stored = await chrome.storage.local.get('tabSense_data');
  const data = stored.tabSense_data || {};
  delete data[tabId];
  await chrome.storage.local.set({ tabSense_data: data });
});

// 4. Content script signals meaningful DOM update
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'TAB_SENSE_CONTENT_UPDATED' && sender.tab?.id) {
    processTab(sender.tab.id);
  }
});

// 5. Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
