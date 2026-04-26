// js/canvas.js v2 — Split layout style Claude.ai
// Chat gauche | Canvas droite avec header propre

const canvasState = {
  open: false,
  tabs: [],
  activeTab: null,
  view: 'code',      // 'code' | 'preview'
  editMode: false,
  historyOpen: false,
};

// ═══════════════════════════════════════════════════════════════════
// ── DETECTION blocs de code ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function extractCodeBlocks(markdown) {
  const blocks = [];
  const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match, idx = 0;
  const canvasLangs = ['html','css','js','javascript','json','python','py',
    'typescript','ts','jsx','tsx','xml','svg','markdown','md',
    'sql','bash','sh','yaml','yml','php','java','c','cpp','text','txt'];
  while ((match = regex.exec(markdown)) !== null) {
    const lang = (match[1] || 'text').toLowerCase();
    const content = match[2];
    if (content.trim().length < 15) continue;
    if (!canvasLangs.includes(lang)) continue;
    idx++;
    blocks.push({
      id: `cv-${Date.now()}-${idx}`,
      lang,
      filename: guessFilename(lang, idx, content),
      content: content.trimEnd(),
      versions: []
    });
  }
  return blocks;
}

function guessFilename(lang, idx, content) {
  const hint = content.match(/(?:filename|file|fichier)[\s:]+([^\s\n]+\.\w+)/i);
  if (hint) return hint[1];
  const ext = { html:'index.html', css:'style.css', js:'script.js', javascript:'script.js',
    json:'data.json', python:'script.py', py:'script.py', typescript:'script.ts',
    ts:'script.ts', jsx:'app.jsx', tsx:'app.tsx', xml:'data.xml', svg:'image.svg',
    markdown:'README.md', md:'README.md', sql:'query.sql', bash:'script.sh', sh:'script.sh',
    yaml:'config.yml', yml:'config.yml', php:'index.php', java:'Main.java',
    c:'main.c', cpp:'main.cpp', text:'texte.txt', txt:'texte.txt' }[lang] || `file.${lang}`;
  return idx > 1 ? ext.replace(/\./, `-${idx}.`) : ext;
}

function langIcon(lang) {
  return { html:'🌐', css:'🎨', js:'⚡', javascript:'⚡', json:'📋',
    python:'🐍', py:'🐍', typescript:'💙', ts:'💙', jsx:'⚛️', tsx:'⚛️',
    svg:'🖼️', markdown:'📝', md:'📝', sql:'🗄️', bash:'💻', sh:'💻',
    yaml:'⚙️', yml:'⚙️', php:'🐘', java:'☕', xml:'📄', c:'🔧', cpp:'🔧' }[lang] || '📄';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════════════
// ── OPEN / CLOSE ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function openCanvas(blocks) {
  if (!blocks || blocks.length === 0) return;
  for (const block of blocks) {
    const existing = canvasState.tabs.find(t => t.filename === block.filename);
    if (existing) {
      existing.versions.unshift({ content: existing.content, ts: new Date().toISOString() });
      if (existing.versions.length > 20) existing.versions.pop();
      existing.content = block.content;
    } else {
      canvasState.tabs.push(block);
    }
  }
  // Activer le dernier onglet ajouté
  canvasState.activeTab = blocks[blocks.length - 1].id;
  // Réinitialiser la vue (preview pour HTML, code sinon)
  const activeTab = canvasState.tabs.find(t => t.id === canvasState.activeTab);
  canvasState.view = (activeTab && ['html','svg'].includes(activeTab.lang)) ? 'preview' : 'code';
  canvasState.editMode = false;
  canvasState.historyOpen = false;
  canvasState.open = true;

  renderCanvas();
  document.getElementById('canvas-panel')?.classList.add('open');
  document.querySelector('.main')?.classList.add('canvas-open');
}

function closeCanvas() {
  canvasState.open = false;
  canvasState.historyOpen = false;
  document.getElementById('canvas-panel')?.classList.remove('open');
  document.querySelector('.main')?.classList.remove('canvas-open');
}

// ═══════════════════════════════════════════════════════════════════
// ── RENDER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function renderCanvas() {
  const panel = document.getElementById('canvas-panel');
  if (!panel) return;
  const tab = canvasState.tabs.find(t => t.id === canvasState.activeTab);
  if (!tab) return;

  const isHtml = ['html','svg'].includes(tab.lang);

  // ── TABS ──
  const tabsHtml = canvasState.tabs.map(t => `
    <div class="canvas-tab ${t.id === canvasState.activeTab ? 'active' : ''}" data-id="${t.id}">
      <span class="canvas-tab-icon">${langIcon(t.lang)}</span>
      <span class="canvas-tab-name">${escHtml(t.filename)}</span>
      <button class="canvas-tab-close" data-id="${t.id}">×</button>
    </div>`).join('');

  // ── HEADER ACTIONS ──
  const headerHtml = `
    <div class="canvas-header">
      <div class="canvas-header-left">${tabsHtml}</div>
      <div class="canvas-header-right">
        <button class="canvas-action-btn ${canvasState.editMode ? 'active' : ''}" id="cv-edit-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          Éditer
        </button>
        <button class="canvas-action-btn" id="cv-copy-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copier
        </button>
        <div class="canvas-export-wrap">
          <button class="canvas-action-btn primary" id="cv-dl-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Télécharger ▾
          </button>
          <div class="canvas-export-dropdown" id="cv-export-menu"></div>
        </div>
        ${tab.versions.length > 0 ? `
        <button class="canvas-action-btn" id="cv-history-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
          ${tab.versions.length}
        </button>` : ''}
        <button class="canvas-action-btn canvas-btn-close-panel" id="cv-close-btn" title="Fermer">×</button>
      </div>
    </div>`;

  // ── SOUS-TOOLBAR (preview/code) si HTML ──
  const subtoolbarHtml = isHtml ? `
    <div class="canvas-subtoolbar">
      <button class="canvas-view-btn ${canvasState.view === 'preview' ? 'active' : ''}" data-view="preview">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Preview
      </button>
      <button class="canvas-view-btn ${canvasState.view === 'code' ? 'active' : ''}" data-view="code">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Code
      </button>
    </div>` : '';

  // ── BODY ──
  let bodyHtml;
  if (canvasState.editMode) {
    bodyHtml = `<textarea class="canvas-editor" id="cv-editor" spellcheck="false">${escHtml(tab.content)}</textarea>`;
  } else if (isHtml && canvasState.view === 'preview') {
    bodyHtml = `<div class="canvas-iframe-wrap"><iframe id="cv-iframe" class="canvas-iframe" sandbox="allow-scripts allow-same-origin"></iframe></div>`;
  } else {
    bodyHtml = `<pre class="canvas-code-view"><code class="language-${tab.lang}">${escHtml(tab.content)}</code></pre>`;
  }

  // ── HISTORY PANEL (overlay droite) ──
  const historyHtml = tab.versions.length > 0 ? `
    <div class="canvas-history-panel ${canvasState.historyOpen ? 'open' : ''}" id="cv-history-panel">
      <div class="canvas-history-header">
        <span>Historique (${tab.versions.length} versions)</span>
        <button class="canvas-history-close" id="cv-history-close">×</button>
      </div>
      <div class="canvas-history-list">
        <div class="canvas-history-item current">
          <div class="canvas-history-time">Version actuelle</div>
          <div class="canvas-history-snippet">${escHtml(tab.content.substring(0, 60))}...</div>
        </div>
        ${tab.versions.map((v, i) => `
          <div class="canvas-history-item" data-version-idx="${i}">
            <div class="canvas-history-time">${new Date(v.ts).toLocaleTimeString('fr-FR')}</div>
            <div class="canvas-history-snippet">${escHtml(v.content.substring(0, 60))}...</div>
            <button class="canvas-history-restore-btn" data-version-idx="${i}">Restaurer</button>
          </div>`).join('')}
      </div>
    </div>` : '';

  panel.innerHTML = `
    ${headerHtml}
    ${subtoolbarHtml}
    <div class="canvas-body">
      ${bodyHtml}
      ${historyHtml}
    </div>`;

  // Appliquer highlight.js
  if (typeof hljs !== 'undefined' && !canvasState.editMode) {
    panel.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
  }

  // Charger iframe
  if (isHtml && canvasState.view === 'preview' && !canvasState.editMode) {
    const iframe = document.getElementById('cv-iframe');
    if (iframe) setTimeout(() => { iframe.srcdoc = tab.content; }, 30);
  }

  bindCanvasEvents(tab);
}

// ═══════════════════════════════════════════════════════════════════
// ── EVENTS ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function bindCanvasEvents(tab) {
  const panel = document.getElementById('canvas-panel');

  // Fermer panel
  document.getElementById('cv-close-btn')?.addEventListener('click', closeCanvas);

  // Tabs click
  panel?.querySelectorAll('.canvas-tab').forEach(t => {
    t.addEventListener('click', e => {
      if (e.target.classList.contains('canvas-tab-close')) return;
      canvasState.activeTab = t.dataset.id;
      const newTab = canvasState.tabs.find(x => x.id === canvasState.activeTab);
      canvasState.view = (newTab && ['html','svg'].includes(newTab.lang)) ? 'preview' : 'code';
      canvasState.editMode = false;
      renderCanvas();
    });
  });

  // Tab close
  panel?.querySelectorAll('.canvas-tab-close').forEach(btn => {
    btn.addEventListener('click', () => {
      canvasState.tabs = canvasState.tabs.filter(t => t.id !== btn.dataset.id);
      if (canvasState.tabs.length === 0) { closeCanvas(); return; }
      canvasState.activeTab = canvasState.tabs[0].id;
      renderCanvas();
    });
  });

  // View buttons (preview/code)
  panel?.querySelectorAll('.canvas-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      canvasState.view = btn.dataset.view;
      canvasState.editMode = false;
      renderCanvas();
    });
  });

  // Edit
  document.getElementById('cv-edit-btn')?.addEventListener('click', () => {
    canvasState.editMode = !canvasState.editMode;
    if (!canvasState.editMode) {
      // Sauvegarder les changements
      const ed = document.getElementById('cv-editor');
      if (ed) {
        const t = canvasState.tabs.find(x => x.id === canvasState.activeTab);
        if (t) t.content = ed.value;
      }
    }
    renderCanvas();
    if (canvasState.editMode) setTimeout(() => document.getElementById('cv-editor')?.focus(), 50);
  });

  // Auto-save on input
  document.getElementById('cv-editor')?.addEventListener('input', e => {
    const t = canvasState.tabs.find(x => x.id === canvasState.activeTab);
    if (t) t.content = e.target.value;
  });

  // Copier
  document.getElementById('cv-copy-btn')?.addEventListener('click', async () => {
    const t = canvasState.tabs.find(x => x.id === canvasState.activeTab);
    if (!t) return;
    await navigator.clipboard.writeText(t.content);
    const btn = document.getElementById('cv-copy-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copié !';
      btn.classList.add('active');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('active'); }, 1500);
    }
  });

  // Menu téléchargement
  document.getElementById('cv-dl-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    const menu = document.getElementById('cv-export-menu');
    if (!menu) return;
    const t = canvasState.tabs.find(x => x.id === canvasState.activeTab);
    if (!t) return;
    menu.innerHTML = buildExportMenuHtml(t);
    menu.classList.toggle('open');
    menu.querySelectorAll('.canvas-export-item').forEach(item => {
      item.addEventListener('click', () => {
        exportCanvas(t, item.dataset.format);
        menu.classList.remove('open');
      });
    });
  });
  document.addEventListener('click', e => {
    const menu = document.getElementById('cv-export-menu');
    if (menu && !e.target.closest('.canvas-export-wrap')) menu.classList.remove('open');
  }, { once: false });

  // Historique
  document.getElementById('cv-history-btn')?.addEventListener('click', () => {
    canvasState.historyOpen = !canvasState.historyOpen;
    document.getElementById('cv-history-panel')?.classList.toggle('open', canvasState.historyOpen);
  });
  document.getElementById('cv-history-close')?.addEventListener('click', () => {
    canvasState.historyOpen = false;
    document.getElementById('cv-history-panel')?.classList.remove('open');
  });
  panel?.querySelectorAll('.canvas-history-restore-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.versionIdx);
      const t = canvasState.tabs.find(x => x.id === canvasState.activeTab);
      if (!t) return;
      t.versions.unshift({ content: t.content, ts: new Date().toISOString() });
      t.content = t.versions[idx + 1].content;
      t.versions.splice(idx + 1, 1);
      canvasState.historyOpen = false;
      canvasState.editMode = false;
      renderCanvas();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── STRIP CODE pour le chat ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function stripCodeBlocks(markdown) {
  return markdown.replace(/```(\w+)?\s*\n[\s\S]*?```/g, match => {
    const lang = (match.match(/```(\w+)/) || ['',''])[1] || 'code';
    const icons = { html:'🌐', css:'🎨', js:'⚡', javascript:'⚡', json:'📋',
      python:'🐍', py:'🐍', ts:'💙', typescript:'💙', jsx:'⚛️', tsx:'⚛️',
      sql:'🗄️', bash:'💻', sh:'💻' };
    const icon = icons[lang] || '📄';
    return `\n<span class="canvas-inline-badge" onclick="document.getElementById('canvas-panel').querySelector('.canvas-tab')?.click()">${icon} <strong>${lang}</strong> — ouvert dans le Canvas →</span>\n`;
  }).trim();
}

// ═══════════════════════════════════════════════════════════════════
// ── EXPORT ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function buildExportMenuHtml(tab) {
  const lang = tab.lang;
  const isHtml = ['html','svg'].includes(lang);
  const isData = ['json','csv','sql','yaml','yml'].includes(lang);
  const isDoc  = ['markdown','md','text','txt'].includes(lang);

  let sections = `<div class="canvas-export-section">
    <div class="canvas-export-section-label">Fichier original</div>
    <button class="canvas-export-item" data-format="raw">
      <span class="canvas-export-icon">📄</span> .${lang} (original)
    </button>
  </div>`;

  if (isHtml || isDoc) {
    sections += `<div class="canvas-export-section">
      <div class="canvas-export-section-label">Document</div>
      <button class="canvas-export-item" data-format="docx">
        <span class="canvas-export-icon">📝</span> Word (.docx)
      </button>
      <button class="canvas-export-item" data-format="pdf">
        <span class="canvas-export-icon">📕</span> PDF
      </button>
    </div>`;
  }
  if (isData) {
    sections += `<div class="canvas-export-section">
      <div class="canvas-export-section-label">Tableur</div>
      <button class="canvas-export-item" data-format="xlsx">
        <span class="canvas-export-icon">📊</span> Excel (.xlsx)
      </button>
      <button class="canvas-export-item" data-format="csv">
        <span class="canvas-export-icon">📋</span> CSV (.csv)
      </button>
    </div>`;
  }
  if (!isHtml && !isDoc && !isData) {
    sections += `<div class="canvas-export-section">
      <button class="canvas-export-item" data-format="txt">
        <span class="canvas-export-icon">📃</span> Texte brut (.txt)
      </button>
    </div>`;
  }
  return sections;
}

async function exportCanvas(tab, format) {
  const base = tab.filename.replace(/\.[^.]+$/, '');
  const mimeMap = { html:'text/html', css:'text/css', js:'text/javascript',
    json:'application/json', md:'text/markdown', svg:'image/svg+xml',
    xml:'application/xml', py:'text/x-python', csv:'text/csv', sql:'text/plain',
    yaml:'text/yaml', yml:'text/yaml' };

  switch (format) {
    case 'raw':
      dlBlob(new Blob([tab.content], { type: mimeMap[tab.lang] || 'text/plain' }), tab.filename);
      break;
    case 'txt':
      dlBlob(new Blob([tab.content], { type: 'text/plain' }), base + '.txt');
      break;
    case 'docx': {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html-docx-js/0.3.1/html-docx.js');
      let html = tab.content;
      if (['md','markdown','txt','text'].includes(tab.lang)) {
        html = typeof marked !== 'undefined' ? marked.parse(tab.content) : `<pre>${tab.content}</pre>`;
      }
      const full = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2cm}
        pre,code{font-family:Consolas,monospace;font-size:10pt;background:#f5f5f5;padding:4px;border-radius:3px}
        h1,h2,h3{color:#222}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px}</style>
      </head><body>${html}</body></html>`;
      if (typeof htmlDocx !== 'undefined') dlBlob(htmlDocx.asBlob(full), base + '.docx');
      else alert('Librairie Word non disponible (vérifiez la connexion internet).');
      break;
    }
    case 'pdf': {
      const win = window.open('', '_blank');
      const html = ['md','markdown'].includes(tab.lang) && typeof marked !== 'undefined'
        ? marked.parse(tab.content) : tab.content;
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2cm}
        pre,code{font-family:Consolas,monospace;font-size:9pt;background:#f5f5f5;padding:4px}
        @media print{body{margin:0}}</style></head><body>${html}</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 500);
      break;
    }
    case 'xlsx': {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      if (typeof XLSX === 'undefined') { alert('Librairie Excel non disponible.'); break; }
      let wb;
      if (tab.lang === 'csv') {
        wb = XLSX.read(tab.content, { type: 'string' });
      } else if (tab.lang === 'json') {
        try {
          const rows = Array.isArray(JSON.parse(tab.content)) ? JSON.parse(tab.content) : [JSON.parse(tab.content)];
          const ws = XLSX.utils.json_to_sheet(rows);
          wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Données');
        } catch(e) { alert('JSON invalide : ' + e.message); break; }
      } else {
        const rows = tab.content.split('\n').map(l => ({ Contenu: l }));
        const ws = XLSX.utils.json_to_sheet(rows);
        wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Données');
      }
      dlBlob(new Blob([XLSX.write(wb, { bookType:'xlsx', type:'array' })],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), base + '.xlsx');
      break;
    }
    case 'csv': {
      if (tab.lang === 'json') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        if (typeof XLSX === 'undefined') break;
        try {
          const rows = Array.isArray(JSON.parse(tab.content)) ? JSON.parse(tab.content) : [JSON.parse(tab.content)];
          const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
          dlBlob(new Blob([csv], { type: 'text/csv' }), base + '.csv');
        } catch(e) { alert('Erreur CSV : ' + e.message); }
      } else {
        dlBlob(new Blob([tab.content], { type: 'text/csv' }), base + '.csv');
      }
      break;
    }
  }
}

function dlBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = resolve;
    document.head.appendChild(s);
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── INIT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function initCanvas() {
  if (!document.getElementById('canvas-panel')) {
    const panel = document.createElement('div');
    panel.id = 'canvas-panel';
    panel.className = 'canvas-panel';
    document.querySelector('.main')?.appendChild(panel);
  }
  console.log('[Canvas v2] Initialisé ✓');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvas);
} else {
  initCanvas();
}
