const BACKEND_GRAPH_URL = 'http://127.0.0.1:8000/graph';

(async function () {
  'use strict';

  // ----------------------------
  // DOM Elements
  // ----------------------------
  const container = document.getElementById('summaryList');

  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSummary = document.getElementById('modalSummary');
  const modalUrl = document.getElementById('modalUrl');
  const closeModalBtn = document.getElementById('closeModal');
  const modalOverlay = document.querySelector('.modal-overlay');

  const summariesView = document.getElementById('summariesView');
  const graphView = document.getElementById('graphView');
  const graphContainer = document.getElementById('graph');
  const toggleViewBtn = document.getElementById('toggleViewBtn');

  async function fetchGraph() {
    const res = await fetch(BACKEND_GRAPH_URL);
    if (!res.ok) {
      throw new Error(`Graph fetch failed: ${res.status}`);
    }
    return res.json();
  }
  
function renderGraph(graphData) {
  const container = graphContainer;
  container.innerHTML = '';

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    container.innerHTML = '<small>No graph data available.</small>';
    return;
  }

  const width = container.clientWidth || 600;
  const height = 520;

  // ----------------------------
  // SVG
  // ----------------------------
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // ----------------------------
  // Tooltip
  // ----------------------------
  const tooltip = d3.select(container)
    .append('div')
    .style('position', 'absolute')
    .style('background', '#fff')
    .style('border', '1px solid #ccc')
    .style('padding', '6px 8px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
    .style('pointer-events', 'none')
    .style('opacity', 0);

  // ----------------------------
  // Force simulation
  // ----------------------------
  const simulation = d3.forceSimulation(graphData.nodes)
    .force(
      'link',
      d3.forceLink(graphData.edges)
        .id(d => d.id)
        .distance(90)
    )
    .force('charge', d3.forceManyBody().strength(-260))
    .force('center', d3.forceCenter(width / 2, height / 2));

  // ----------------------------
  // Links
  // ----------------------------
  const link = svg.append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.7)
    .selectAll('line')
    .data(graphData.edges)
    .enter()
    .append('line')
    .attr('stroke-width', d =>
      d.relation === 'contains' ? 1.2 : 0.6
    )
    .attr('stroke-dasharray', d =>
      d.relation === 'semantically_related' ? '4 3' : null
    );

  // ----------------------------
  // Nodes (group = circle + text)
  // ----------------------------
  const node = svg.append('g')
    .selectAll('.node')
    .data(graphData.nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(
      d3.drag()
        .on('start', dragStart)
        .on('drag', dragged)
        .on('end', dragEnd)
    );

  // ---- Circle
  node.append('circle')
    .attr('r', d => d.type === 'Tab' ? 9 : 6)
    .attr('fill', d => d.type === 'Tab' ? '#6A5ACD' : '#FFA500');

  // ---- Label
  node.append('text')
    .text(d => d.label)
    .attr('y', d => d.type === 'Tab' ? 18 : 14)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#333')
    .style('pointer-events', 'none');

  // ----------------------------
  // Hover tooltip
  // ----------------------------
  node
    .on('mouseenter', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.label}</strong><br/>
          <small>${(d.summary || d.entity_type || '').slice(0, 200)}</small>
        `);
    })
    .on('mousemove', event => {
      tooltip
        .style('left', event.offsetX + 12 + 'px')
        .style('top', event.offsetY + 12 + 'px');
    })
    .on('mouseleave', () => {
      tooltip.style('opacity', 0);
    });

  // ----------------------------
  // Click → focus tab (Tab nodes only)
  // ----------------------------
  node.on('click', (event, d) => {
    if (d.type !== 'Tab' || d.tabId == null) return;

    chrome.tabs.update(d.tabId, { active: true });
    if (d.windowId != null) {
      chrome.windows.update(d.windowId, { focused: true });
    }
  });

  // ----------------------------
  // Tick
  // ----------------------------
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x}, ${d.y})`);
  });

  // ----------------------------
  // Drag helpers
  // ----------------------------
  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}


  // ----------------------------
  // Utilities
  // ----------------------------
  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function truncate(str = '', max = 180) {
    return str.length > max ? str.slice(0, max).trim() + '…' : str;
  }

  function shortUrl(url = '') {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  // ----------------------------
  // View Toggle
  // ----------------------------
  toggleViewBtn.addEventListener('click', async () => {
    const showingGraph = !graphView.classList.contains('hidden');

    if (showingGraph) {
      graphView.classList.add('hidden');
      summariesView.classList.remove('hidden');
      toggleViewBtn.textContent = 'Graph';
      return;
    }

    summariesView.classList.add('hidden');
    graphView.classList.remove('hidden');
    toggleViewBtn.textContent = 'Summary';

    graphContainer.innerHTML = '<small>Loading graph…</small>';

    try {
      const graphData = await fetchGraph();

requestAnimationFrame(() => {
  renderGraph(graphData);
});


    } catch (err) {
      let message = 'Unknown error';

      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      } else {
        message = JSON.stringify(err, null, 2);
      }

      graphContainer.innerHTML = `
        <div style="
          color:#b00020;
          background:#fff5f5;
          border:1px solid #f1b0b7;
          padding:10px;
          border-radius:6px;
          font-size:13px;
        ">
          <strong>Failed to load graph</strong>
          <pre style="margin-top:6px;white-space:pre-wrap;">${message}</pre>
        </div>
      `;

      console.error(err);
    }
  }); // ✅ IMPORTANT: closes addEventListener

  // ----------------------------
  // Modal logic
  // ----------------------------
  function openDetailModal(info) {
    modalTitle.textContent = info.title || 'Untitled';
    modalSummary.textContent = info.summary || info.raw_text || '';
    modalUrl.href = info.url || '#';
    modal.classList.remove('hidden');
  }

  function closeDetailModal() {
    modal.classList.add('hidden');
  }

  closeModalBtn.addEventListener('click', closeDetailModal);
  modalOverlay.addEventListener('click', closeDetailModal);

  // ----------------------------
  // Render summaries
  // ----------------------------
  function createCard(tabId, info) {
    const card = document.createElement('div');
    card.className = 'item';

    const previewText = info.summary || info.raw_text || '(No content)';

    card.innerHTML = `
      <div class="card-header">
        <div class="title">${escapeHtml(info.title || 'Untitled')}</div>
        <button class="close-btn">×</button>
      </div>
      <div class="summary">${escapeHtml(truncate(previewText))}</div>
      <div class="card-url">
        <a href="${info.url}" target="_blank">${escapeHtml(shortUrl(info.url))}</a>
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.close-btn') || e.target.tagName === 'A') return;
      openDetailModal(info);
    });

    return card;
  }

  async function loadData() {
    const stored = await chrome.storage.local.get('tabSense_data');
    container.innerHTML = '';
    Object.entries(stored.tabSense_data || {}).forEach(([id, info]) =>
      container.appendChild(createCard(id, info))
    );
  }

  loadData();
})();
