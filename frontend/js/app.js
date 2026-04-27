
function fetchLocalModels() {
    // Modèles locaux non supportés dans GoudAI
    return Promise.resolve([]);
}

// Gestion sidebar mobile
(function() {
    function hideSidebar() {
        var sb = document.getElementById('sidebar');
        if (sb && window.innerWidth <= 768) sb.style.display = 'none';
    }
    function showSidebar() {
        var sb = document.getElementById('sidebar');
        if (!sb) return;
        sb.style.cssText = 'display:flex!important;position:fixed!important;top:0!important;left:0!important;bottom:0!important;width:85vw!important;max-width:320px!important;z-index:99999!important;overflow-y:auto!important;flex-direction:column!important;';
        var ov = document.createElement('div');
        ov.id = '_mob_ov';
        ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.5)';
        ov.onclick = function() { hideSidebar(); ov.remove(); };
        document.body.appendChild(ov);
    }
    document.addEventListener('DOMContentLoaded', function() {
        hideSidebar();
        var toggle = document.getElementById('sidebar-toggle');
        if (toggle) toggle.addEventListener('click', function() {
            if (window.innerWidth > 768) return;
            var sb = document.getElementById('sidebar');
            var ov = document.getElementById('_mob_ov');
            if (ov) { hideSidebar(); ov.remove(); } else { showSidebar(); }
        }, true);
        var closeBtn = document.getElementById('sidebar-close-btn');
        if (closeBtn) closeBtn.onclick = function() {
            hideSidebar();
            var ov = document.getElementById('_mob_ov');
            if (ov) ov.remove();
        };
    });
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            var sb = document.getElementById('sidebar');
            if (sb) sb.style.cssText = '';
            var ov = document.getElementById('_mob_ov');
            if (ov) ov.remove();
        }
    });
})();


// --- Audio settings (TTS / STT / modèles auxiliaires) ---
// Source de vérité : preferences_enc serveur (clé `audioSettings`).
// localStorage = cache local pour latence et fallback hors-ligne.
const AUDIO_SETTINGS = {
    ttsProvider: 'openai',
    sttProvider: 'openai',
    ttsVoice: 'coral',
    summaryModel: 'gpt-4.1-2025-04-14',
    roleOptimizeModel: 'claude-sonnet-4-5-20250929'
};

async function loadAudioSettingsFromServer() {
    try {
        const res = await fetch(`${KIRO_API}/api/user/preferences`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            const audio = data?.preferences?.audioSettings;
            if (audio && typeof audio === 'object') {
                Object.assign(AUDIO_SETTINGS, audio);
                localStorage.setItem('goudai-audio-settings', JSON.stringify(AUDIO_SETTINGS));
                return;
            }
        }
    } catch (err) {
        console.warn('[audio-settings] sync from server failed:', err.message);
    }
    // Fallback : cache localStorage
    try {
        const cached = JSON.parse(localStorage.getItem('goudai-audio-settings') || '{}');
        Object.assign(AUDIO_SETTINGS, cached);
    } catch {}
}

async function saveAudioSettings(settings) {
    if (settings.ttsProvider) AUDIO_SETTINGS.ttsProvider = settings.ttsProvider;
    if (settings.sttProvider) AUDIO_SETTINGS.sttProvider = settings.sttProvider;
    if (settings.enhanceModel) AUDIO_SETTINGS.enhanceModel = settings.enhanceModel;
    if (settings.summaryModel) AUDIO_SETTINGS.summaryModel = settings.summaryModel;
    if (settings.roleOptimizeModel) AUDIO_SETTINGS.roleOptimizeModel = settings.roleOptimizeModel;
    localStorage.setItem('goudai-audio-settings', JSON.stringify(AUDIO_SETTINGS));
    // Sync serveur (non-bloquant : on ignore l'échec, le cache local prend le relais)
    try {
        const getRes = await fetch(`${KIRO_API}/api/user/preferences`, { credentials: 'include' });
        const current = getRes.ok ? ((await getRes.json()).preferences || {}) : {};
        await fetch(`${KIRO_API}/api/user/preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ...current, audioSettings: { ...AUDIO_SETTINGS } })
        });
    } catch (err) {
        console.warn('[audio-settings] sync to server failed:', err.message);
    }
}

// Au démarrage : charger les réglages depuis le serveur (auth requise → silencieux si 401).
loadAudioSettingsFromServer();

function saveBudgetSettings() {
    // Budget non implementé dans GoudAI - stub
}

function loadBudgetSettings() {
    try { return JSON.parse(localStorage.getItem('goudai-budget') || '{}'); } catch { return {}; }
}


// ── Safe getElementById : évite les crashes sur éléments absents ──
(function() {
    var _orig = document.getElementById.bind(document);
    var _safe = {
        style: new Proxy({}, { get: function() { return ''; }, set: function() { return true; } }),
        classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
        addEventListener: function(){},
        removeEventListener: function(){},
        dispatchEvent: function(){},
        appendChild: function(){},
        remove: function(){},
        click: function(){},
        focus: function(){},
        blur: function(){},
        querySelector: function(){ return null; },
        querySelectorAll: function(){ return []; },
        get value() { return ''; }, set value(v) {},
        get checked() { return false; }, set checked(v) {},
        get textContent() { return ''; }, set textContent(v) {},
        get innerHTML() { return ''; }, set innerHTML(v) {},
        get className() { return ''; }, set className(v) {},
        get disabled() { return false; }, set disabled(v) {},
        get selectedIndex() { return 0; }, set selectedIndex(v) {},
        get options() { return []; },
        get selectedOptions() { return [{ value: '', textContent: '' }]; },
        get dataset() { return {}; },
        offsetHeight: 0, offsetWidth: 0,
        getBoundingClientRect: function() { return { top:0, bottom:0, left:0, right:0, width:0, height:0 }; }
    };
    document.getElementById = function(id) {
        var el = _orig(id);
        return el || _safe;
    };
})();


// ── Safe getElementById : évite les crashes sur éléments absents ──
(function() {
    var _orig = document.getElementById.bind(document);
    var _safe = {
        style: new Proxy({}, { get: function() { return ''; }, set: function() { return true; } }),
        classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
        addEventListener: function(){},
        removeEventListener: function(){},
        dispatchEvent: function(){},
        appendChild: function(){},
        remove: function(){},
        click: function(){},
        focus: function(){},
        blur: function(){},
        querySelector: function(){ return null; },
        querySelectorAll: function(){ return []; },
        get value() { return ''; }, set value(v) {},
        get checked() { return false; }, set checked(v) {},
        get textContent() { return ''; }, set textContent(v) {},
        get innerHTML() { return ''; }, set innerHTML(v) {},
        get className() { return ''; }, set className(v) {},
        get disabled() { return false; }, set disabled(v) {},
        get selectedIndex() { return 0; }, set selectedIndex(v) {},
        get options() { return []; },
        get selectedOptions() { return [{ value: '', textContent: '' }]; },
        get dataset() { return {}; },
        offsetHeight: 0, offsetWidth: 0,
        getBoundingClientRect: function() { return { top:0, bottom:0, left:0, right:0, width:0, height:0 }; }
    };
    document.getElementById = function(id) {
        var el = _orig(id);
        return el || _safe;
    };
})();

const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const tokenInfo = document.getElementById('token-info');
const costInfo = document.getElementById('cost-info');
const convList = document.getElementById('conv-list');
const modelSelect = document.getElementById('model-select');
const imageModelSelect = document.getElementById('image-model-select');
const searchModelSelect = document.getElementById('search-model-select');
const spSelect = document.getElementById('sp-select');
const spListEl = document.getElementById('sp-list');
const spAddBtn = document.getElementById('sp-add-btn');
const spModalOverlay = document.getElementById('sp-modal-overlay');
const spModalTitle = document.getElementById('sp-modal-title');
const spModalNom = document.getElementById('sp-modal-nom');
const spModalContenu = document.getElementById('sp-modal-contenu');
const spModalCancel = document.getElementById('sp-modal-cancel');
const spModalSave = document.getElementById('sp-modal-save');
const themeToggle = document.getElementById('theme-toggle');
const convSearch = document.getElementById('conv-search');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const attachPreview = document.getElementById('attach-preview');
const micBtn = document.getElementById('mic-btn');
const webSearchToggle = document.getElementById('web-search-toggle');
const enhancePromptBtn = document.getElementById('enhance-prompt-btn');

// Toolbar inline du composer (Kiro v3 - PR9)
const composerToolbar  = document.getElementById('composer-toolbar');
const toolbarInsertBtn = document.getElementById('toolbar-insert-btn');
const toolbarEnhanceBtn = document.getElementById('toolbar-enhance-btn');
const toolbarSaveBtn   = document.getElementById('toolbar-save-btn');

const promptPickerBtn = document.getElementById('prompt-picker-btn');
const promptPickerDropdown = document.getElementById('prompt-picker-dropdown');
const prListEl = document.getElementById('pr-list');
const prAddBtn = document.getElementById('pr-add-btn');
const prModalOverlay = document.getElementById('pr-modal-overlay');
const prModalTitle = document.getElementById('pr-modal-title');
const prModalNom = document.getElementById('pr-modal-nom');
const prModalContenu = document.getElementById('pr-modal-contenu');
const prModalCancel = document.getElementById('pr-modal-cancel');
const prModalSave = document.getElementById('pr-modal-save');
let prEditingFilename = null;

const catIcons = document.getElementById('cat-icons');
const catAddBtn = document.getElementById('cat-add-btn');
const catModalOverlay = document.getElementById('cat-modal-overlay');
const catModalTitle = document.getElementById('cat-modal-title');
const catModalNom = document.getElementById('cat-modal-nom');
const catModalIcone = document.getElementById('cat-modal-icone');
const catModalCouleur = document.getElementById('cat-modal-couleur');
const catModalCancel = document.getElementById('cat-modal-cancel');
const catModalSave = document.getElementById('cat-modal-save');
const catModalDelete = document.getElementById('cat-modal-delete');

let activeCategoryId = null;
let editingCategoryId = null;
let currentConversationCategory = null;

const apikeysBtn = document.getElementById('apikeys-btn');
const apikeysModalOverlay = document.getElementById('apikeys-modal-overlay');
const apikeysModalCancel = document.getElementById('apikeys-modal-cancel');
const apikeysModalSave = document.getElementById('apikeys-modal-save');

let currentModel = null;
let currentImageModel = null;
let currentSearchModel = null;
let conversationHistory = [];
let isStreaming = false;
let currentAbortController = null;
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCost = 0;
let totalImageCost = 0;
let totalAudioCost = 0;
let costByModel = {};
let conversationId = null;
let conversationStartTime = null;
let conversationTitle = null;
let firstPrompt = null;
let conversationStarted = false;
let currentSystemPrompt = null;
let spEditingFilename = null;
var _canvasBlocksFromHistory = [];
let pendingImages = [];
let pendingFiles = [];
let currentTtsAudio = null;
let mediaRecorder = null;
let micChunks = [];
let micStartTime = null;
let webSearchEnabled = false;

// --- Web search constantes (Kiro v3 - PR10) ---
// Editeurs qui supportent la recherche web nativement (tools/web_search côté API).
const WEB_SEARCH_EDITEURS = ['openai', 'anthropic', 'google'];
const WEB_SEARCH_TOOLTIPS = {
    openai:    'Recherche web OpenAI · 0,01 $ / requête',
    anthropic: 'Recherche web Anthropic · 0,01 $ / requête',
    google:    'Recherche web Google (Gemini) · gratuit jusqu\u2019à 5000 req./jour'
};
// Coût fixe par requête (en USD).
const WEB_SEARCH_COST_PER_REQ      = { openai: 0.01, anthropic: 0.01, google: 0 };
// Coût additionnel par citation (Grok facture par source). Vide pour l'instant.
const WEB_SEARCH_COST_PER_CITATION = {};

let originalPromptBeforeEnhance = null;
let isEnhancing = false;

// --- Liens dans un nouvel onglet (marked) ---
marked.use({
    renderer: {
        link({ href, title, text }) {
            const t = title ? ` title="${title}"` : '';
            return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
    }
});

// --- Thème clair/sombre ---
function applyTheme(dark) {
    document.body.classList.toggle('dark', dark);
    themeToggle.innerHTML = dark ? '&#9790; Thème sombre' : '&#9788; Thème clair';
}

const savedTheme = localStorage.getItem('goudai-theme');
applyTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('goudai-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '&#9790; Thème sombre' : '&#9788; Thème clair';
});

// --- Recherche de conversations ---
convSearch.addEventListener('input', () => {
    const query = convSearch.value.toLowerCase();
    const items = convList.querySelectorAll('.conv-item');
    for (const item of items) {
        if (!query) {
            item.style.display = '';
            continue;
        }
        const title = item.querySelector('.conv-item-title').textContent.toLowerCase();
        const fulltext = item.dataset.fulltext || '';
        const match = title.includes(query) || fulltext.includes(query);
        item.style.display = match ? '' : 'none';
    }
});

// --- Pièces jointes ---
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

attachBtn.addEventListener('click', () => fileInput.click());

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.xml', '.log', '.js', '.py', '.html', '.css'];

function isTextFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/');
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function extractPdfText(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        console.warn('pdfjsLib non disponible');
        return '';
    }
    try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            pages.push(tc.items.map(item => item.str).join(' '));
        }
        const result = pages.join('\n\n');
        console.log(`PDF: ${pdf.numPages} pages, ${result.length} caractères extraits`);
        return result;
    } catch (e) {
        console.error('Erreur extraction PDF:', e);
        return '';
    }
}

function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function processAttachedFile(file) {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = { dataUrl, mimeType: file.type, name: file.name };
            pendingImages.push(img);
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsDataURL(file);
    } else if (isPdf(file)) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            const base64 = arrayBufferToBase64(arrayBuffer);
            const textContent = await extractPdfText(arrayBuffer);
            pendingFiles.push({ name: file.name, mimeType: 'application/pdf', data: base64, textContent });
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsArrayBuffer(file);
    } else if (isTextFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const textContent = e.target.result;
            const base64 = btoa(unescape(encodeURIComponent(textContent)));
            pendingFiles.push({ name: file.name, mimeType: file.type || 'text/plain', data: base64, textContent });
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsText(file);
    }
}

fileInput.addEventListener('change', () => {
    for (const file of fileInput.files) {
        processAttachedFile(file);
    }
    fileInput.value = '';
});

// --- Drag & drop de fichiers sur la zone de saisie ---
const inputArea = document.querySelector('.input-area');

inputArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    inputArea.classList.add('drag-over');
});

inputArea.addEventListener('dragleave', (e) => {
    if (!inputArea.contains(e.relatedTarget)) {
        inputArea.classList.remove('drag-over');
    }
});

inputArea.addEventListener('drop', (e) => {
    e.preventDefault();
    inputArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
        processAttachedFile(file);
    }
});

function renderAttachPreview() {
    attachPreview.innerHTML = '';
    pendingImages.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'attach-thumb';

        const imgEl = document.createElement('img');
        imgEl.src = img.dataUrl;
        imgEl.alt = img.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'attach-thumb-remove';
        removeBtn.textContent = '\u00D7';
        removeBtn.addEventListener('click', () => {
            pendingImages.splice(idx, 1);
            renderAttachPreview();
            updateSendButton();
        });

        thumb.appendChild(imgEl);
        thumb.appendChild(removeBtn);
        attachPreview.appendChild(thumb);
    });
    pendingFiles.forEach((file, idx) => {
        const chip = document.createElement('div');
        chip.className = 'attach-file-chip';

        const icon = document.createElement('span');
        icon.className = 'attach-file-chip-icon';
        icon.textContent = '\uD83D\uDCC4';

        const name = document.createElement('span');
        name.className = 'attach-file-chip-name';
        name.textContent = file.name;
        name.title = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'attach-file-chip-remove';
        removeBtn.textContent = '\u00D7';
        removeBtn.addEventListener('click', () => {
            pendingFiles.splice(idx, 1);
            renderAttachPreview();
            updateSendButton();
        });

        chip.appendChild(icon);
        chip.appendChild(name);
        chip.appendChild(removeBtn);
        attachPreview.appendChild(chip);
    });
}

// --- Export Markdown ---
const exportMdBtn = document.getElementById('export-md-btn');
const exportHtmlBtn = document.getElementById('export-html-btn');
const summaryBtn = document.getElementById('summary-btn');

function updateExportMdBtn() {
    const show = conversationHistory.length > 0 ? '' : 'none';
    exportMdBtn.style.display = show;
    exportHtmlBtn.style.display = show;
    summaryBtn.style.display = show;
}

// --- Utilitaire : label d'un modèle ---
function getModelLabel(modelId) {
    if (!modelId) return modelId;
    const m = MODELS.find(m => m.id === modelId)
           || IMAGE_MODELS.find(m => m.id === modelId)
           || SEARCH_MODELS.find(m => m.id === modelId);
    return m ? m.label : modelId;
}

// --- Marqueur visuel de changement de modèle ---
function addModelSwitchElement(fromLabel, toLabel) {
    const div = document.createElement('div');
    div.className = 'model-switch-marker';
    div.textContent = `─── ${fromLabel} → ${toLabel} ───`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addModelSwitch(fromId, toId) {
    conversationHistory.push({ role: 'system', type: 'model-switch', from: fromId, to: toId });
    addModelSwitchElement(getModelLabel(fromId), getModelLabel(toId));
    saveConversation();
}

exportMdBtn.addEventListener('click', () => {
    if (conversationHistory.length === 0) return;

    const activeModel = currentModel || currentImageModel || currentSearchModel || 'inconnu';
    const date = conversationStartTime ? new Date(conversationStartTime).toLocaleString('fr-FR') : '';

    const displayCost = totalCost + totalImageCost + totalAudioCost;
    const costStr = displayCost > 0 ? `$${displayCost.toFixed(4)}` : '—';

    // Collecter les modèles utilisés dans l'ordre
    function getModelType(modelId) {
        if (IMAGE_MODELS.some(m => m.id === modelId)) return 'Image';
        if (SEARCH_MODELS.some(m => m.id === modelId)) return 'Recherche';
        return 'Texte';
    }
    const switches = conversationHistory.filter(m => m.type === 'model-switch');
    const usedModels = [];
    const firstModel = switches.length > 0 ? switches[0].from : activeModel;
    usedModels.push(firstModel);
    for (const sw of switches) {
        if (usedModels[usedModels.length - 1] !== sw.to) usedModels.push(sw.to);
    }

    let md = `# Conversation Kiro\n\n`;
    if (usedModels.length === 1) {
        md += `**Modèle** : ${getModelLabel(usedModels[0])} *(${getModelType(usedModels[0])})*  \n`;
    } else {
        md += `**Modèles utilisés** :  \n`;
        for (const mid of usedModels) {
            md += `- ${getModelLabel(mid)} *(${getModelType(mid)})*  \n`;
        }
    }
    if (date) md += `**Date** : ${date}  \n`;
    if (currentSystemPrompt) md += `**Rôle** : ${currentSystemPrompt.nom}  \n`;
    md += `**Recherche web** : ${webSearchEnabled ? 'Activée' : 'Désactivée'}  \n`;
    md += `**Tokens** : ${totalInputTokens.toLocaleString('fr-FR')} entrée / ${totalOutputTokens.toLocaleString('fr-FR')} sortie  \n`;
    md += `**Coût estimé** : ${costStr}  \n`;
    md += `\n---\n\n`;

    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            md += `> **${getModelLabel(msg.from)}** *(${getModelType(msg.from)})* → **${getModelLabel(msg.to)}** *(${getModelType(msg.to)})*\n\n---\n\n`;
            continue;
        }

        const role = msg.role === 'user' ? '🧑 Utilisateur' : '🤖 Assistant';
        md += `## ${role}\n\n`;

        if (typeof msg.content === 'string') {
            md += msg.content + '\n\n';
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text') {
                    md += part.text + '\n\n';
                } else if (part.type === 'image') {
                    md += `*[Image jointe]*\n\n`;
                } else if (part.type === 'file') {
                    md += `*[Fichier joint : ${part.name}]*\n\n`;
                }
            }
        }

        if (msg.citations && msg.citations.length > 0) {
            md += `**Sources :**\n`;
            msg.citations.forEach((cit, i) => {
                const url = typeof cit === 'string' ? cit : cit.url;
                const title = typeof cit === 'string' ? url : (cit.title || url);
                md += `${i + 1}. [${title}](${url})\n`;
            });
            md += '\n';
        }

        md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (conversationId || 'conversation').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
});

// --- Export HTML autonome ---
exportHtmlBtn.addEventListener('click', () => {
    if (conversationHistory.length === 0) return;

    const activeModel = currentModel || currentImageModel || currentSearchModel || 'inconnu';
    const date = conversationStartTime ? new Date(conversationStartTime).toLocaleString('fr-FR') : '';
    const displayCost = totalCost + totalImageCost + totalAudioCost;
    const costStr = displayCost > 0 ? `$${displayCost.toFixed(4)}` : '\u2014';
    const title = conversationTitle || 'Conversation Kiro';

    let messagesHtml = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            messagesHtml += `<div class="model-switch">\u2500\u2500\u2500 ${escHtml(getModelLabel(msg.from))} \u2192 ${escHtml(getModelLabel(msg.to))} \u2500\u2500\u2500</div>`;
            continue;
        }
        const role = msg.role;
        const roleLabel = role === 'user' ? '\ud83e\uddd1 Utilisateur' : '\ud83e\udd16 Assistant';
        let contentHtml = '';
        if (typeof msg.content === 'string') {
            contentHtml = role === 'assistant' ? marked.parse(msg.content) : `<p>${escHtml(msg.content).replace(/\n/g, '<br>')}</p>`;
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text') {
                    contentHtml += role === 'assistant' ? marked.parse(part.text) : `<p>${escHtml(part.text).replace(/\n/g, '<br>')}</p>`;
                } else if (part.type === 'image') {
                    contentHtml += `<p><em>[Image jointe]</em></p>`;
                } else if (part.type === 'file') {
                    contentHtml += `<p><em>[Fichier : ${escHtml(part.name)}]</em></p>`;
                }
            }
        }
        if (msg.citations && msg.citations.length > 0) {
            contentHtml += '<div class="citations"><strong>Sources :</strong><ol>';
            msg.citations.forEach(cit => {
                const url = typeof cit === 'string' ? cit : cit.url;
                const t = typeof cit === 'string' ? url : (cit.title || url);
                contentHtml += `<li><a href="${escHtml(url)}" target="_blank">${escHtml(t)}</a></li>`;
            });
            contentHtml += '</ol></div>';
        }
        messagesHtml += `<div class="message ${role}"><div class="role">${roleLabel}</div>${contentHtml}</div>`;
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
:root{--bg:#fff;--text:#1a1a1a;--msg-user:#f0f0f0;--msg-asst:#e0e0e0;--border:#e0e0e0;--secondary:#888}
.dark{--bg:#1a1a1a;--text:#e0e0e0;--msg-user:#2a2a2a;--msg-asst:#333;--border:#333;--secondary:#999}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);padding:24px;max-width:900px;margin:0 auto;line-height:1.6}
.header{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.header h1{font-size:1.4rem;margin-bottom:8px}
.header .meta{font-size:0.82rem;color:var(--secondary)}
.theme-btn{position:fixed;top:12px;right:12px;background:var(--msg-user);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--text);font-size:0.8rem}
.message{padding:14px 18px;border-radius:16px;margin-bottom:12px;max-width:80%}
.message.user{background:var(--msg-user);align-self:flex-start;border-bottom-left-radius:4px;margin-right:auto}
.message.assistant{background:var(--msg-asst);align-self:flex-end;border-bottom-right-radius:4px;margin-left:auto}
.role{font-size:0.75rem;font-weight:600;color:var(--secondary);margin-bottom:6px}
.model-switch{text-align:center;font-size:0.8rem;color:var(--secondary);padding:12px 0}
pre{background:rgba(0,0,0,0.06);border-radius:8px;padding:12px;overflow-x:auto;margin:0.5em 0;font-size:0.85rem}
.dark pre{background:rgba(255,255,255,0.08)}
code{background:rgba(0,0,0,0.05);border-radius:3px;padding:1px 4px;font-size:0.88em}
.dark code{background:rgba(255,255,255,0.1)}
pre code{background:none;padding:0}
table{border-collapse:collapse;margin:0.5em 0;font-size:0.9em}
th,td{border:1px solid var(--border);padding:4px 10px}
blockquote{border-left:3px solid var(--border);padding:0.2em 0 0.2em 12px;margin:0.5em 0;color:var(--secondary)}
.citations{margin-top:10px;font-size:0.85em}
.citations ol{padding-left:1.2em}
.citations a{color:var(--text)}
a{color:inherit}
</style>
</head>
<body>
<button class="theme-btn" onclick="document.body.classList.toggle('dark');localStorage.setItem('t',document.body.classList.contains('dark')?'d':'l')">\u263e Th\u00e8me</button>
<div class="header">
<h1>${escHtml(title)}</h1>
<div class="meta">
Mod\u00e8le : ${escHtml(getModelLabel(activeModel))} | Date : ${escHtml(date)}<br>
Tokens : ${totalInputTokens.toLocaleString('fr-FR')} entr\u00e9e / ${totalOutputTokens.toLocaleString('fr-FR')} sortie | Co\u00fbt : ${escHtml(costStr)}
</div>
</div>
${messagesHtml}
<script>if(localStorage.getItem('t')==='d')document.body.classList.add('dark')</script>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (conversationId || 'conversation').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `${safeName}.html`;
    a.click();
    URL.revokeObjectURL(url);
});

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Résumé IA pour nouvelle conversation ---
summaryBtn.addEventListener('click', async () => {
    if (conversationHistory.length === 0) return;

    let convText = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') continue;
        const role = msg.role === 'user' ? 'Utilisateur' : 'Assistant';
        const text = getTextFromContent(msg.content);
        if (text) convText += `${role} :\n${text}\n\n`;
    }

    const originalHtml = summaryBtn.innerHTML;
    summaryBtn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
    summaryBtn.disabled = true;

    try {
        const modelId = AUDIO_SETTINGS.summaryModel || 'gpt-4.1-2025-04-14';
        const prompt = `Génère un résumé structuré de cette conversation, optimisé pour servir de contexte initial à une nouvelle conversation. Inclus les points clés, décisions, et le contexte nécessaire.\n\n---\n\n${convText}`;
        const summary = await streamText(modelId, prompt);

        if (summary) {
            saveConversation();
            resetConversation();
            promptInput.value = summary;
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
            updateSendButton();
            promptInput.focus();
        }
    } catch (e) {
        console.error('Erreur résumé IA:', e);
        alert('Erreur lors de la génération du résumé : ' + e.message);
    } finally {
        summaryBtn.innerHTML = originalHtml;
        summaryBtn.disabled = false;
    }
});



// --- Toggles sections sidebar ---
document.querySelectorAll('.sp-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = document.getElementById(toggle.dataset.target);
        if (!target) return;
        const collapsed = target.classList.toggle('collapsed');
        toggle.innerHTML = collapsed ? '&#9656;' : '&#9662;';
        localStorage.setItem('minou-collapse-' + toggle.dataset.target, collapsed ? '1' : '0');
    });
    // Clic sur le header entier
    toggle.closest('.sp-header').addEventListener('click', (e) => {
        if (e.target.closest('.sp-add-btn')) return;
        toggle.click();
    });
    // Restaurer l'état
    const saved = localStorage.getItem('minou-collapse-' + toggle.dataset.target);
    if (saved === '1') {
        document.getElementById(toggle.dataset.target)?.classList.add('collapsed');
        toggle.innerHTML = '&#9656;';
    } else if (saved === '0') {
        document.getElementById(toggle.dataset.target)?.classList.remove('collapsed');
        toggle.innerHTML = '&#9662;';
    }
});

// --- Toggle sidebar ---
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        const isOpen = sidebar.classList.toggle('open');
        let overlay = document.getElementById('_sidebar_overlay');
        if (isOpen) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = '_sidebar_overlay';
                overlay.style.cssText = 'position:fixed;inset:0;z-index:299;background:rgba(0,0,0,0.5)';
                overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.remove(); });
                document.body.appendChild(overlay);
            }
        } else { document.getElementById('_sidebar_overlay')?.remove(); }
    } else {
        const collapsed = sidebar.classList.toggle('collapsed');
        sidebarToggle.classList.toggle('collapsed', collapsed);
        sidebarToggle.title = collapsed ? 'Afficher le panneau' : 'Masquer le panneau';
    }
});

// --- Toggle recherche web ---
webSearchToggle.addEventListener('click', () => {
    webSearchEnabled = !webSearchEnabled;
    updateWebSearchBtn();
});

// --- Web search visibilité + coût (Kiro v3 - PR10) ---
// updateWebSearchBtn() est appelée :
//   - au boot (pour initialiser la visibilité)
//   - à chaque changement de modèle (modelSelect change)
//   - au toggle du bouton (sync visuel)
function updateWebSearchBtn() {
    if (!webSearchToggle) return;
    const editeur = currentModel ? (typeof getModelEditeur === 'function' ? getModelEditeur(currentModel) : null) : null;
    const supports = editeur && WEB_SEARCH_EDITEURS.includes(editeur);
    if (supports) {
        webSearchToggle.style.display = '';
        webSearchToggle.classList.toggle('active', webSearchEnabled);
        const tooltip = WEB_SEARCH_TOOLTIPS[editeur] || 'Recherche web';
        webSearchToggle.title = webSearchEnabled ? `${tooltip} · activée` : tooltip;
    } else {
        webSearchToggle.style.display = 'none';
        webSearchToggle.classList.remove('active');
        webSearchEnabled = false;
        webSearchToggle.title = 'Recherche web';
    }
}

// Calcule le coût d'une recherche web selon le provider et le nombre de citations.
// Renvoie 0 si la recherche web était désactivée OU si le provider n'est pas supporté.
function calcWebSearchCost(modelId, citations) {
    if (!webSearchEnabled) return 0;
    const editeur = (typeof getModelEditeur === 'function') ? getModelEditeur(modelId) : null;
    if (!editeur || !WEB_SEARCH_EDITEURS.includes(editeur)) return 0;
    let cost = WEB_SEARCH_COST_PER_REQ[editeur] || 0;
    const perCitation = WEB_SEARCH_COST_PER_CITATION[editeur];
    if (perCitation && citations && citations.length) {
        cost += citations.length * perCitation;
    }
    return cost;
}

// --- Amélioration du prompt ---
const enhanceIconDefault = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="M11 6.2L9.7 5"/><path d="M11 11.8L9.7 13"/><path d="M2 21l9-9"/></svg>';
const enhanceIconRevert = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
const enhanceIconLoading = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

function updateEnhanceBtn() {
    const hasText = promptInput.value.trim() !== '';
    if (originalPromptBeforeEnhance !== null) {
        enhancePromptBtn.disabled = isStreaming;
        enhancePromptBtn.innerHTML = enhanceIconRevert;
        enhancePromptBtn.classList.add('revert');
        enhancePromptBtn.title = 'Revenir au prompt original';
    } else {
        enhancePromptBtn.disabled = !hasText || isEnhancing || isStreaming;
        enhancePromptBtn.innerHTML = isEnhancing ? enhanceIconLoading : enhanceIconDefault;
        enhancePromptBtn.classList.remove('revert');
        enhancePromptBtn.title = 'Améliorer le prompt';
    }
    // Sync la toolbar inline (PR9 Kiro v3) — refletes le nouvel etat enhance
    if (typeof updatePromptToolbar === 'function') updatePromptToolbar();
}

enhancePromptBtn.addEventListener('click', async () => {
    if (isEnhancing) return;

    // Mode retour : restaurer le prompt original
    if (originalPromptBeforeEnhance !== null) {
        promptInput.value = originalPromptBeforeEnhance;
        originalPromptBeforeEnhance = null;
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
        updateEnhanceBtn();
        updateSendButton();
        promptInput.focus();
        return;
    }

    // Mode amélioration
    const text = promptInput.value.trim();
    if (!text) return;

    originalPromptBeforeEnhance = null;
    isEnhancing = true;
    updateEnhanceBtn();
    const savedText = text;
    promptInput.value = '';
    promptInput.classList.add('enhancing');

    enhancePrompt(
        savedText,
        (delta) => {
            promptInput.value += delta;
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
        },
        () => {
            promptInput.classList.remove('enhancing');
            originalPromptBeforeEnhance = savedText;
            isEnhancing = false;
            updateEnhanceBtn();
            updateSendButton();
            promptInput.focus();
        },
        (err) => {
            console.error('Erreur amélioration prompt:', err);
            promptInput.classList.remove('enhancing');
            promptInput.value = savedText;
            showModelAlert(err.message || 'Erreur lors de l\'amélioration du prompt.');
            isEnhancing = false;
            updateEnhanceBtn();
            updateSendButton();
            promptInput.focus();
        }
    );
});

// --- Composer toolbar (Kiro v3 - PR9) ---
// Machine d'etat 3 modes (insert / enhance / revert) qui controle quels
// boutons toolbar sont visibles selon l'etat du textarea.
function updatePromptToolbar() {
    if (!composerToolbar) return;
    const hasText = promptInput.value.trim() !== '';
    const showInsert  = !hasText && originalPromptBeforeEnhance === null;
    const showEnhance = hasText && originalPromptBeforeEnhance === null;
    const showRevert  = originalPromptBeforeEnhance !== null;
    const showSave    = hasText || showRevert;

    toolbarInsertBtn.style.display  = showInsert  ? 'inline-flex' : 'none';
    toolbarSaveBtn.style.display    = showSave    ? 'inline-flex' : 'none';

    if (showRevert) {
        toolbarEnhanceBtn.style.display = 'inline-flex';
        toolbarEnhanceBtn.classList.add('revert');
        toolbarEnhanceBtn.title = 'Revenir au prompt original';
        toolbarEnhanceBtn.querySelector('.btn-label').textContent = 'Revenir au prompt original';
    } else if (showEnhance) {
        toolbarEnhanceBtn.style.display = 'inline-flex';
        toolbarEnhanceBtn.classList.remove('revert');
        toolbarEnhanceBtn.title = isEnhancing ? 'Amélioration en cours…' : 'Améliorer le prompt';
        toolbarEnhanceBtn.querySelector('.btn-label').textContent = isEnhancing ? 'Amélioration…' : 'Améliorer le prompt';
        toolbarEnhanceBtn.disabled = isEnhancing;
    } else {
        toolbarEnhanceBtn.style.display = 'none';
    }
}

// Les boutons toolbar delegent aux handlers existants (UX coherente).
toolbarInsertBtn.addEventListener('click', () => promptPickerBtn.click());
toolbarEnhanceBtn.addEventListener('click', () => enhancePromptBtn.click());
toolbarSaveBtn.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (!text) return;
    // Ouvre la modale "Nouveau prompt" pre-remplie avec le texte courant.
    prEditingFilename = null;
    prModalTitle.textContent = 'Nouveau prompt';
    prModalNom.value = '';
    prModalContenu.value = text;
    prModalOverlay.style.display = 'flex';
    prModalNom.focus();
});

// Re-affiche la toolbar a chaque modification du textarea + au boot.
promptInput.addEventListener('input', updatePromptToolbar);
updatePromptToolbar();

// --- Catégories ---

function refreshCatBar() {
    const cats = listCategories();
    catIcons.innerHTML = '';
    for (const cat of cats) {
        const btn = document.createElement('button');
        btn.className = 'cat-icon';
        btn.title = cat.nom;
        btn.textContent = cat.icone || '?';
        const isActive = activeCategoryId === cat.id;
        btn.style.borderColor = cat.couleur;
        btn.style.backgroundColor = isActive ? cat.couleur : 'transparent';
        btn.style.color = isActive ? '#fff' : '';
        if (isActive) btn.classList.add('active');

        btn.addEventListener('click', () => {
            activeCategoryId = activeCategoryId === cat.id ? null : cat.id;
            refreshCatBar();
            refreshConvList();
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openCatModal(cat.id);
        });

        // Drag & drop : recevoir une conversation
        btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            btn.classList.add('drag-over');
        });
        btn.addEventListener('dragleave', () => {
            btn.classList.remove('drag-over');
        });
        btn.addEventListener('drop', async (e) => {
            e.preventDefault();
            btn.classList.remove('drag-over');
            const filename = e.dataTransfer.getData('text/plain');
            if (!filename) return;
            await updateConversationCategory(filename, cat.id);
            // Mettre à jour si c'est la conversation active
            const expectedFn = conversationId
                ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                : null;
            if (filename === expectedFn) {
                currentConversationCategory = cat.id;
            }
            refreshConvList();
        });

        catIcons.appendChild(btn);
    }
}

catAddBtn.addEventListener('click', () => openCatModal(null));

// --- Emoji Picker ---
const EMOJI_LIBRARY = {
    'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','🤔','🤗','🤫','🤭','😏','😌','😴','🤓','😎','🥳','😤','😠','🤯','😱','🥺','😢','😭','🫠'],
    'Gestes': ['👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤘','👌','🫶','💪','👋','✋','🖐️','🤚','👆','👇','👈','👉','☝️','🫵','🙏'],
    'Coeurs': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','♥️'],
    'Travail': ['💼','📁','📂','📊','📈','📉','📋','📌','📎','✏️','📝','🗂️','🗃️','🗄️','💻','🖥️','⌨️','🖱️','📱','📧','✉️','📬','🏢','🏠','⏰','📅','🗓️'],
    'Science': ['🔬','🔭','⚗️','🧪','🧫','🧬','💊','💉','🩺','🧮','📐','📏','🔋','⚡','🧲','🌡️','☢️','☣️'],
    'Creative': ['🎨','🎭','🎬','🎤','🎧','🎵','🎶','🎸','🎹','🥁','🎻','📷','📸','🎥','🖌️','🖍️','✒️','🪄','💡','📖','📚','✍️'],
    'Nature': ['🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🌳','🌲','🍃','🍂','🍁','🌍','🌎','🌏','🌙','⭐','🌟','✨','☀️','🌈','🔥','💧','❄️','🌊'],
    'Animaux': ['🐱','🐶','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅','🦋','🐝','🐞','🐢','🐍','🐬','🐳','🦄','🐲'],
    'Food': ['🍕','🍔','🍟','🌭','🌮','🌯','🍣','🍜','🍝','🍩','🍪','🎂','🍰','🍫','🍬','☕','🍵','🍺','🍷','🥤','🍎','🍊','🍋','🍇','🍓','🍑','🥑','🥕'],
    'Transport': ['🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','✈️','🚀','🛸','🚁','⛵','🚢','🚲','🛴','🏍️','🚄','🚅','🚇'],
    'Objets': ['🔑','🗝️','🔒','🔓','🛡️','⚔️','🏆','🥇','🥈','🥉','🎯','🎮','🧩','🎲','♟️','🔮','🧿','🎁','🎀','🏷️','💎','👑','🧸','🪩'],
    'Symboles': ['✅','❌','⭕','❗','❓','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','▶️','⏸️','⏹️','🔄','💤','🚫','♻️','⚠️','🏳️','🏴','🚩']
};

const emojiPickerEl = document.getElementById('emoji-picker');
const emojiGridEl = document.getElementById('emoji-grid');
const emojiTabsEl = document.getElementById('emoji-tabs');
const emojiSearchEl = document.getElementById('emoji-search');
const emojiIconeBtn = document.getElementById('cat-modal-icone-btn');
const emojiPreview = document.getElementById('cat-modal-icone-preview');

function initEmojiTabs() {
    emojiTabsEl.innerHTML = '';
    const categories = Object.keys(EMOJI_LIBRARY);
    for (const cat of categories) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-tab';
        btn.textContent = EMOJI_LIBRARY[cat][0];
        btn.title = cat;
        btn.addEventListener('click', () => {
            emojiSearchEl.value = '';
            renderEmojiGrid(cat);
            emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
        });
        emojiTabsEl.appendChild(btn);
    }
}

function renderEmojiGrid(activeCategory = null, filter = '') {
    emojiGridEl.innerHTML = '';
    const query = filter.toLowerCase();
    const categories = Object.entries(EMOJI_LIBRARY);

    for (const [catName, emojis] of categories) {
        if (activeCategory && catName !== activeCategory) continue;

        const filtered = query
            ? emojis.filter(e => e.includes(query) || catName.toLowerCase().includes(query))
            : emojis;

        if (filtered.length === 0) continue;

        if (!activeCategory || query) {
            const label = document.createElement('div');
            label.className = 'emoji-cat-label';
            label.textContent = catName;
            emojiGridEl.appendChild(label);
        }

        for (const emoji of filtered) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-grid-item';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                catModalIcone.value = emoji;
                emojiPreview.textContent = emoji;
                emojiPickerEl.style.display = 'none';
            });
            emojiGridEl.appendChild(btn);
        }
    }

    if (emojiGridEl.children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'emoji-cat-label';
        empty.textContent = 'Aucun résultat';
        emojiGridEl.appendChild(empty);
    }
}

emojiIconeBtn.addEventListener('click', () => {
    const visible = emojiPickerEl.style.display !== 'none';
    if (visible) {
        emojiPickerEl.style.display = 'none';
    } else {
        initEmojiTabs();
        emojiSearchEl.value = '';
        renderEmojiGrid();
        emojiPickerEl.style.display = '';
        emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        emojiSearchEl.focus();
    }
});

emojiSearchEl.addEventListener('input', () => {
    emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
    renderEmojiGrid(null, emojiSearchEl.value.trim());
});

// Fermer le picker si on clique en dehors
document.addEventListener('click', (e) => {
    if (emojiPickerEl.style.display !== 'none'
        && !emojiPickerEl.contains(e.target)
        && !emojiIconeBtn.contains(e.target)) {
        emojiPickerEl.style.display = 'none';
    }
});

// Fermer les menus de copie si on clique en dehors
document.addEventListener('click', () => {
    document.querySelectorAll('.copy-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.menu-open').forEach(b => b.classList.remove('menu-open'));
});

function openCatModal(catId) {
    editingCategoryId = catId;
    emojiPickerEl.style.display = 'none';
    if (catId) {
        const cat = readCategory(catId);
        if (!cat) return;
        catModalTitle.textContent = 'Modifier la catégorie';
        catModalNom.value = cat.nom;
        catModalIcone.value = cat.icone;
        emojiPreview.textContent = cat.icone || '?';
        catModalCouleur.value = cat.couleur;
        catModalDelete.style.display = '';
    } else {
        catModalTitle.textContent = 'Nouvelle catégorie';
        catModalNom.value = '';
        catModalIcone.value = '';
        emojiPreview.textContent = '?';
        catModalCouleur.value = '#3b82f6';
        catModalDelete.style.display = 'none';
    }
    catModalOverlay.style.display = '';
    catModalNom.focus();
}

catModalCancel.addEventListener('click', () => {
    catModalOverlay.style.display = 'none';
});

catModalOverlay.addEventListener('click', (e) => {
    if (e.target === catModalOverlay) catModalOverlay.style.display = 'none';
});

catModalSave.addEventListener('click', () => {
    const nom = catModalNom.value.trim();
    if (!nom) return;
    const id = editingCategoryId || ('cat_' + Date.now());
    writeCategory(id, {
        nom,
        couleur: catModalCouleur.value,
        icone: catModalIcone.value || '?'
    });
    catModalOverlay.style.display = 'none';
    refreshCatBar();
});

catModalDelete.addEventListener('click', async () => {
    if (!editingCategoryId) return;
    if (!confirm('Supprimer cette catégorie ? Les conversations seront décatégorisées.')) return;
    // Décatégoriser toutes les conversations de cette catégorie
    const conversations = await listConversationFiles();
    for (const conv of conversations) {
        if (conv.category === editingCategoryId) {
            await updateConversationCategory(conv.filename, null);
        }
    }
    // Si la conversation active est dans cette catégorie
    if (currentConversationCategory === editingCategoryId) {
        currentConversationCategory = null;
    }
    deleteCategory(editingCategoryId);
    catModalOverlay.style.display = 'none';
    if (activeCategoryId === editingCategoryId) activeCategoryId = null;
    refreshCatBar();
    refreshConvList();
});

// --- Sélecteur de modèle personnalisé ---

const EDITEUR_LABELS = {
    openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google',
    mistral: 'Mistral', perplexity: 'Perplexity', local: 'Local'
};
const EDITEUR_ORDER = ['openai', 'anthropic', 'google', 'mistral', 'perplexity', 'local'];

// Tooltip partagé pour les infos modèle
const _tooltip = document.createElement('div');
_tooltip.id = 'custom-select-tooltip';
document.body.appendChild(_tooltip);

document.addEventListener('mouseover', (e) => {
    const info = e.target.closest('.custom-select-info');
    if (!info) return;
    const text = info.dataset.tooltip;
    if (!text) return;
    _tooltip.textContent = text;
    const rect = info.getBoundingClientRect();
    _tooltip.style.left = (rect.right + 8) + 'px';
    _tooltip.style.top = (rect.top + rect.height / 2) + 'px';
    _tooltip.style.transform = 'translateY(-50%)';
    _tooltip.classList.add('visible');
});

document.addEventListener('mouseout', (e) => {
    const info = e.target.closest('.custom-select-info');
    if (info) _tooltip.classList.remove('visible');
});

function upgradeToCustomSelect(selectEl) {
    // Créer le DOM personnalisé
    const container = document.createElement('div');
    container.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';

    const triggerText = document.createElement('span');
    triggerText.className = 'custom-select-text';
    triggerText.textContent = 'Aucun';

    trigger.appendChild(triggerText);

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    container.appendChild(trigger);
    container.appendChild(dropdown);

    // Insérer avant le <select> et le cacher
    selectEl.parentNode.insertBefore(container, selectEl);
    selectEl.style.display = 'none';

    // Stocker les refs
    selectEl._customValue = '';
    selectEl._customDisabled = false;
    selectEl._customUI = { container, trigger, triggerText, dropdown };
    selectEl._customModels = []; // sera rempli par populateCustomSelect

    // Intercepter .value
    Object.defineProperty(selectEl, 'value', {
        get() { return selectEl._customValue; },
        set(v) {
            selectEl._customValue = v || '';
            updateTriggerDisplay(selectEl);
            updateActiveOption(selectEl);
        },
        configurable: true
    });

    // Intercepter .disabled
    Object.defineProperty(selectEl, 'disabled', {
        get() { return selectEl._customDisabled; },
        set(v) {
            selectEl._customDisabled = !!v;
            container.classList.toggle('disabled', !!v);
        },
        configurable: true
    });

    // Clic sur le trigger → ouvrir/fermer
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectEl._customDisabled) return;
        // Fermer les autres dropdowns ouverts
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== container) el.classList.remove('open');
        });
        container.classList.toggle('open');
        if (container.classList.contains('open')) {
            const r = trigger.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.left = r.left + 'px';
            dropdown.style.width = Math.max(r.width, 220) + 'px';
            const spaceAbove = r.top;
            const spaceBelow = window.innerHeight - r.bottom;
            if (spaceAbove > 200 && spaceAbove > spaceBelow) {
                dropdown.style.top = 'auto';
                dropdown.style.bottom = (window.innerHeight - r.top + 4) + 'px';
            } else {
                dropdown.style.top = (r.bottom + 4) + 'px';
                dropdown.style.bottom = 'auto';
            }
        }
    });

    // Clic sur une option
    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option, .custom-select-option--empty');
        if (!option) return;
        const val = option.dataset.value;
        selectEl._customValue = val || '';
        updateTriggerDisplay(selectEl);
        updateActiveOption(selectEl);
        container.classList.remove('open');
        selectEl.dispatchEvent(new Event('change'));
    });

    // Fermer au clic extérieur
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('open');
        }
    });

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            container.classList.remove('open');
        }
    });
}

function updateTriggerDisplay(selectEl) {
    const { triggerText } = selectEl._customUI;
    const val = selectEl._customValue;
    if (!val) {
        triggerText.textContent = 'Aucun';
        return;
    }
    const model = selectEl._customModels.find(m => m.id === val);
    triggerText.textContent = model ? model.label : val;
}

function updateActiveOption(selectEl) {
    const { dropdown } = selectEl._customUI;
    const val = selectEl._customValue;
    dropdown.querySelectorAll('.custom-select-option, .custom-select-option--empty').forEach(el => {
        el.classList.toggle('active', el.dataset.value === val);
    });
}

function populateCustomSelect(selectEl, models, tarifFn) {
    const { dropdown } = selectEl._customUI;
    selectEl._customModels = models;

    // Grouper par editeur
    const groups = {};
    for (const m of models) {
        if (!groups[m.editeur]) groups[m.editeur] = [];
        groups[m.editeur].push(m);
    }

    let html = '<div class="custom-select-option--empty" data-value="">Aucun</div>';

    for (const editeur of EDITEUR_ORDER) {
        if (!groups[editeur]) continue;
        html += `<div class="custom-select-provider">`;
        html += `<div class="custom-select-group">${EDITEUR_LABELS[editeur] || editeur}</div>`;
        for (const m of groups[editeur]) {
            const tarif = tarifFn(m.id);
            let priceStr = '';
            if (m.editeur === 'local') {
                priceStr = 'Gratuit';
            } else if (tarif) {
                priceStr = `$${tarif.inputPer1M} → $${tarif.outputPer1M} /M`;
                if (tarif.imageOutput) {
                    priceStr += ` · $${tarif.imageOutput} /img`;
                }
            }
            html += `<div class="custom-select-option" data-value="${m.id}" title="${(m.description||'').replace(/"/g,'&quot;')}">`;
            html += `<div class="custom-select-option-text">`;
            html += `<span class="custom-select-option-name">${m.label}</span>`;
            if (priceStr) html += `<span class="custom-select-option-price">${priceStr}</span>`;
            html += `</div>`;
            if (m.description) html += `<span class="custom-select-info" data-tooltip="${m.description.replace(/"/g, '&quot;')}">i</span>`;
            html += `</div>`;
        }
        html += `</div>`;
    }

    dropdown.innerHTML = html;
    selectEl._customValue = '';
    updateTriggerDisplay(selectEl);
}

// --- Initialisation ---
initConfig().then(async () => {
    upgradeToCustomSelect(modelSelect);
    upgradeToCustomSelect(imageModelSelect);
    upgradeToCustomSelect(searchModelSelect);
    populateModelSelect();
    populateImageModelSelect();
    populateSearchModelSelect();
    updateTokenDisplay();
    updateWebSearchBtn();
    refreshConvList();
    refreshCatBar();
    await importDefaultSystemPrompts();
    refreshSpList();
    refreshPrList();

    // Appliquer le dernier modèle utilisé au chargement
    const lastModel = localStorage.getItem('goudai-last-model');
    if (lastModel) {
        modelSelect.value = lastModel;
        currentModel = lastModel;
    }
});

// --- Remplir le sélecteur de modèles texte ---
function populateModelSelect() {
    populateCustomSelect(modelSelect, MODELS, getTarif);
    currentModel = null;
}

// --- Remplir le sélecteur de modèles image ---
function populateImageModelSelect() {
    populateCustomSelect(imageModelSelect, IMAGE_MODELS, getImageTarif);
    currentImageModel = null;
}

// --- Remplir le sélecteur de modèles recherche ---
function populateSearchModelSelect() {
    populateCustomSelect(searchModelSelect, SEARCH_MODELS, getSearchTarif);
    currentSearchModel = null;
}

// --- Sélecteurs mutuellement exclusifs ---
function checkApiKeyForModel(modelId, lookupFn) {
    const editeur = lookupFn(modelId);
    if (editeur && !API_KEYS[editeur]) {
        if (editeur === 'local') {
            showModelAlert('URL du serveur local manquante. Renseignez-la dans Configuration.');
        } else {
            showModelAlert(`Clé API ${editeur} manquante. Renseignez-la dans Configuration.`);
        }
        return false;
    }
    return true;
}

modelSelect.addEventListener('change', () => {
    if (modelSelect.value && !checkApiKeyForModel(modelSelect.value, getModelEditeur)) {
        modelSelect.value = '';
        currentModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentModel = modelSelect.value || null;
    if (currentModel) {
        localStorage.setItem('goudai-last-model', currentModel);
        imageModelSelect.value = '';
        currentImageModel = null;
        searchModelSelect.value = '';
        currentSearchModel = null;
        document.getElementById('image-format-label').style.display = 'none';
        document.getElementById('image-format-select').style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    updateWebSearchBtn();
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

imageModelSelect.addEventListener('change', () => {
    if (imageModelSelect.value && !checkApiKeyForModel(imageModelSelect.value, getImageModelEditeur)) {
        imageModelSelect.value = '';
        currentImageModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentImageModel = imageModelSelect.value || null;
    const imgFormatLabel = document.getElementById('image-format-label');
    const imgFormatSelect = document.getElementById('image-format-select');
    if (currentImageModel) {
        modelSelect.value = '';
        currentModel = null;
        searchModelSelect.value = '';
        currentSearchModel = null;
        imgFormatLabel.style.display = '';
        imgFormatSelect.style.display = '';
    } else {
        imgFormatLabel.style.display = 'none';
        imgFormatSelect.style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    updateWebSearchBtn();
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

searchModelSelect.addEventListener('change', () => {
    if (searchModelSelect.value && !checkApiKeyForModel(searchModelSelect.value, getSearchModelEditeur)) {
        searchModelSelect.value = '';
        currentSearchModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentSearchModel = searchModelSelect.value || null;
    if (currentSearchModel) {
        modelSelect.value = '';
        currentModel = null;
        imageModelSelect.value = '';
        currentImageModel = null;
        document.getElementById('image-format-label').style.display = 'none';
        document.getElementById('image-format-select').style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    updateWebSearchBtn();
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

// --- Auto-resize du textarea ---
promptInput.addEventListener('input', () => {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
    updateSendButton();
    // Réinitialiser l'état d'amélioration si l'utilisateur modifie manuellement le texte
    if (originalPromptBeforeEnhance !== null && !isEnhancing) {
        originalPromptBeforeEnhance = null;
        updateEnhanceBtn();
    }
    if (!isEnhancing) updateEnhanceBtn();
});

// --- Activer/désactiver le bouton OK ---
function updateSendButton() {
    if (isStreaming) {
        sendBtn.disabled = false;
        sendBtn.textContent = '■';
        sendBtn.classList.add('stop-mode');
    } else {
        const hasText = promptInput.value.trim() !== '';
        const hasImages = pendingImages.length > 0;
        const hasFiles = pendingFiles.length > 0;
        sendBtn.disabled = !hasText && !hasImages && !hasFiles;
        sendBtn.textContent = 'OK';
        sendBtn.classList.remove('stop-mode');
    }
    updateEnhanceBtn();
}

// --- Ctrl/Cmd+Entrée pour envoyer ---
const isMac = navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Mac');
const _hint = document.getElementById('input-hint'); if (_hint) _hint.textContent = isMac ? '⌘+Entrée pour envoyer' : 'Ctrl+Entrée pour envoyer';

promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isStreaming && !sendBtn.disabled) sendMessage();
    }
});

// --- Clic sur OK / Stop ---
sendBtn.addEventListener('click', () => {
    if (isStreaming) {
        if (currentAbortController) currentAbortController.abort();
    } else {
        if (!sendBtn.disabled) sendMessage();
    }
});

// --- Nouvelle conversation ---
newChatBtn.addEventListener('click', () => {
    saveConversation();
    resetConversation();
    refreshConvList();
});

function resetConversation() {
    conversationHistory = [];
    chatContainer.innerHTML = '';
    promptInput.value = '';
    promptInput.style.height = 'auto';
    totalInputTokens = 0;
    totalOutputTokens = 0;
    totalCost = 0;
    totalImageCost = 0;
    totalAudioCost = 0;
    _canvasBlocksFromHistory = [];
    if (typeof closeCanvas === 'function') closeCanvas();
    document.getElementById('canvas-reopen-btn')?.remove();
    costByModel = {};
    conversationId = null;
    conversationStartTime = null;
    conversationTitle = null;
    firstPrompt = null;
    conversationStarted = false;
    currentSystemPrompt = null;
    
    // Restaurer le dernier modèle utilisé
    const lastModel = localStorage.getItem('goudai-last-model');
    if (lastModel) {
        modelSelect.value = lastModel;
        currentModel = lastModel;
    } else {
        modelSelect.value = '';
        currentModel = null;
    }

    currentImageModel = null;
    currentSearchModel = null;
    currentConversationCategory = null;
    pendingImages = [];
    pendingFiles = [];
    originalPromptBeforeEnhance = null;
    isEnhancing = false;
    attachPreview.innerHTML = '';
    modelSelect.disabled = false;
    imageModelSelect.value = '';
    imageModelSelect.disabled = false;
    document.getElementById('image-format-label').style.display = 'none';
    document.getElementById('image-format-select').style.display = 'none';
    searchModelSelect.value = '';
    searchModelSelect.disabled = false;
    spSelect.disabled = false;
    // Rôle conservé
    updateTokenDisplay();
    updateSendButton();
    updateEnhanceBtn();
    highlightActiveConv();
    updateExportMdBtn();
    promptInput.focus();
}

// --- Alerte modèle manquant ---
let modelAlertTimer = null;
function showModelAlert(msg) {
    const el = document.getElementById('model-alert');
    if (msg) el.textContent = msg;
    el.style.display = '';
    if (modelAlertTimer) clearTimeout(modelAlertTimer);
    modelAlertTimer = setTimeout(() => {
        el.style.display = 'none';
        el.textContent = 'Veuillez choisir un modèle (texte ou image) avant d\'envoyer.';
    }, 4000);
}

// --- Générer l'identifiant de conversation ---
function generateConversationId(prompt) {
    const now = new Date();
    const date = now.getFullYear() + '-'
        + String(now.getMonth() + 1).padStart(2, '0') + '-'
        + String(now.getDate()).padStart(2, '0') + ' '
        + String(now.getHours()).padStart(2, '0') + '-'
        + String(now.getMinutes()).padStart(2, '0');
    const prefix = prompt.substring(0, 10).replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ ]/g, '_');
    return `${prefix} ${date}`;
}

// --- Mettre à jour l'affichage tokens et coût ---
function updateTokenDisplay() {
    tokenInfo.textContent = `Tokens — entrée : ${totalInputTokens.toLocaleString('fr-FR')} | sortie : ${totalOutputTokens.toLocaleString('fr-FR')}`;

    const displayCost = totalCost + totalImageCost + totalAudioCost;
    if (displayCost > 0) {
        costInfo.textContent = `Coût estimé : $${displayCost.toFixed(4)}`;
    } else {
        costInfo.textContent = 'Coût estimé : —';
    }
}

// --- Sauvegarder la conversation dans un fichier JSON ---
function saveConversation() {
    if (!conversationId || conversationHistory.length === 0) return;

    const data = {
        id: conversationId,
        title: conversationTitle,
        model: currentModel || currentImageModel || currentSearchModel,
        startTime: conversationStartTime,
        totalInputTokens,
        totalOutputTokens,
        totalCost,
        totalImageCost,
        totalAudioCost,
        costByModel,
        systemPrompt: currentSystemPrompt ? currentSystemPrompt.nom : null,
        category: currentConversationCategory,
        messages: conversationHistory
    };
    const filename = conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json';
    const content = formatConversationFile(data);
    writeConversationFile(filename, content).then(() => {
        refreshConvList();
        checkBudgetAlert();
    });
    updateExportMdBtn();
}

// --- Génération automatique du titre de conversation ---
async function maybeGenerateTitle() {
    // Seulement après le premier échange (1 user + 1 assistant)
    if (conversationTitle || conversationHistory.length !== 2) return;

    const userMsg = getTextFromContent(conversationHistory[0].content);
    const assistantMsg = getTextFromContent(conversationHistory[1].content);
    if (!userMsg) return;

    // Utiliser le modèle de chat en cours
    const modelId = currentModel || currentImageModel || currentSearchModel;
    if (!modelId) return;

    try {
        const prompt = `Donne un titre très court (3 à 6 mots max, en français) pour cette conversation. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.\n\nUtilisateur : ${userMsg.substring(0, 300)}\n\nAssistant : ${assistantMsg.substring(0, 300)}`;
        const title = (await streamText(modelId, prompt))?.trim();
        if (title) {
            conversationTitle = title;
            saveConversation();
        }
    } catch (e) {
        console.error('Erreur génération titre:', e);
    }
}

// --- Extraire le texte d'un content (string ou array multimodal) ---
function getTextFromContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(p => {
            if (p.type === 'text') return p.text;
            if (p.type === 'file') return p.textContent || '';
            return '';
        }).join('');
    }
    return '';
}

// --- Ajouter un message dans le DOM ---
function addMessage(role, content, citations, generationTime, thinking) {
    const div = document.createElement('div');
    div.className = `message message-${role}`;

    // Bloc de raisonnement dépliable (assistant uniquement)
    if (role === 'assistant' && thinking) {
        const details = document.createElement('details');
        details.className = 'thinking-block';
        const summary = document.createElement('summary');
        summary.textContent = 'Raisonnement';
        details.appendChild(summary);
        const thinkContent = document.createElement('div');
        thinkContent.className = 'thinking-content';
        thinkContent.innerHTML = marked.parse(thinking);
        details.appendChild(thinkContent);
        div.appendChild(details);
    }

    // Images (messages multimodaux)
    if (Array.isArray(content)) {
        const images = content.filter(p => p.type === 'image');
        if (images.length > 0) {
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'message-images';
            for (const img of images) {
                const imgWrap = document.createElement('div');
                imgWrap.className = 'message-image-wrap';

                const imgEl = document.createElement('img');
                const src = img.dataUrl || `data:${img.mimeType};base64,${img.data}`;
                imgEl.src = src;
                imgEl.alt = 'Image';

                const dlBtn = document.createElement('button');
                dlBtn.className = 'image-download-btn';
                dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                dlBtn.title = 'Télécharger';
                dlBtn.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = src;
                    const ext = (img.mimeType || 'image/png').split('/')[1] || 'png';
                    a.download = `kiro-image.${ext}`;
                    a.click();
                });

                attachLightboxToImg(imgEl);
                imgWrap.appendChild(imgEl);
                imgWrap.appendChild(dlBtn);
                imagesDiv.appendChild(imgWrap);
            }
            div.appendChild(imagesDiv);
        }

        // Fichiers joints
        const files = content.filter(p => p.type === 'file');
        if (files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            for (const file of files) {
                const chip = document.createElement('a');
                chip.className = 'message-file-chip';
                chip.title = file.name;
                if (file.data) {
                    const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], { type: file.mimeType || 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    chip.href = url;
                    chip.download = file.name;
                } else {
                    chip.href = '#';
                }
                chip.innerHTML = '\uD83D\uDCC4 ' + (file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name);
                filesDiv.appendChild(chip);
            }
            div.appendChild(filesDiv);
        }
    }

    // Texte
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    const textContent = getTextFromContent(content);
    if (role === 'assistant' && textContent) {
        textDiv.innerHTML = marked.parse(textContent);
        addCodeCopyButtons(textDiv);
    } else {
        textDiv.textContent = textContent;
    }
    div.appendChild(textDiv);

    // Positionner un menu fixed par rapport à un bouton
    function positionMenu(menu, btn) {
        const r = btn.getBoundingClientRect();
        // Par défaut : au-dessus du bouton, aligné à gauche
        let left = r.left;
        let top = r.top - menu.offsetHeight - 4;
        // Débordement à droite → aligner à droite du bouton
        if (left + menu.offsetWidth > window.innerWidth - 4) {
            left = r.right - menu.offsetWidth;
        }
        // Débordement à gauche
        if (left < 4) left = 4;
        // Débordement en haut → ouvrir vers le bas
        if (top < 4) top = r.bottom + 4;
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
    }

    // Bouton copier (sous la bulle)
    const copySvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const checkSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-copy-btn';
    copyBtn.title = 'Copier';
    const copyIcon = document.createElement('span');
    copyIcon.className = 'copy-icon';
    copyIcon.innerHTML = copySvg;
    copyBtn.appendChild(copyIcon);

    function doCopy(text) {
        navigator.clipboard.writeText(text).then(() => {
            copyIcon.innerHTML = checkSvg;
            setTimeout(() => { copyIcon.innerHTML = copySvg; }, 1500);
        });
    }

    if (role === 'assistant') {
        // Menu contextuel avec choix Copier / Copier Markdown
        const copyMenu = document.createElement('div');
        copyMenu.className = 'copy-menu';
        copyMenu.innerHTML = '<div class="copy-menu-item" data-mode="text">Copier</div><div class="copy-menu-item" data-mode="md">Copier au format Markdown</div>';
        document.body.appendChild(copyMenu);

        copyBtn.addEventListener('click', (e) => {
            if (e.target.closest('.copy-menu-item')) return;
            document.querySelectorAll('.copy-menu.open').forEach(m => { if (m !== copyMenu) m.classList.remove('open'); });
            document.querySelectorAll('.menu-open').forEach(b => b.classList.remove('menu-open'));
            copyMenu.classList.toggle('open');
            copyBtn.classList.toggle('menu-open', copyMenu.classList.contains('open'));
            if (copyMenu.classList.contains('open')) positionMenu(copyMenu, copyBtn);
            e.stopPropagation();
        });

        copyMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.copy-menu-item');
            if (!item) return;
            e.stopPropagation();
            copyMenu.classList.remove('open');
            copyBtn.classList.remove('menu-open');
            const mode = item.dataset.mode;
            if (mode === 'md') {
                doCopy(getTextFromContent(content));
            } else {
                const textEl = div.querySelector('.message-text');
                doCopy(textEl ? textEl.textContent : getTextFromContent(content));
            }
        });
    } else {
        copyBtn.addEventListener('click', () => {
            const textEl = div.querySelector('.message-text');
            doCopy(textEl ? textEl.textContent : getTextFromContent(content));
        });
    }

    // Boutons sous la bulle
    const btnRow = document.createElement('div');
    btnRow.className = 'message-btn-row';
    btnRow.appendChild(copyBtn);

    // Bouton sauvegarder prompt (user uniquement)
    if (role === 'user') {
        const savePromptBtn = document.createElement('button');
        savePromptBtn.className = 'message-save-prompt-btn';
        savePromptBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
        savePromptBtn.title = 'Enregistrer ce prompt';
        savePromptBtn.addEventListener('click', () => {
            const textEl = div.querySelector('.message-text');
            const text = textEl ? textEl.textContent : getTextFromContent(content);
            if (!text) return;
            openPrModal(null, text);
        });
        btnRow.appendChild(savePromptBtn);
    }

    // Temps de génération (assistant uniquement)
    if (role === 'assistant') {
        const genTimeEl = document.createElement('span');
        genTimeEl.className = 'message-gen-time';
        genTimeEl.textContent = generationTime ? formatGenTime(generationTime) : '';
        btnRow.appendChild(genTimeEl);
    }

    // Bouton lecture vocale OpenAI TTS (assistant uniquement, pas pour les images)
    const hasImages = Array.isArray(content) && content.some(p => p.type === 'image');
    if (role === 'assistant' && !hasImages) {
        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'message-tts-btn';
        const iconPlay = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
        const iconStop = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
        const iconLoading = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
        const ttsIcon = document.createElement('span');
        ttsIcon.className = 'tts-icon';
        ttsIcon.innerHTML = iconPlay;
        ttsBtn.appendChild(ttsIcon);
        ttsBtn.title = 'Lire à haute voix';

        // Menu contextuel TTS
        const ttsMenu = document.createElement('div');
        ttsMenu.className = 'copy-menu';
        ttsMenu.innerHTML = '<div class="copy-menu-item" data-mode="play">Lire à haute voix</div><div class="copy-menu-item" data-mode="save">Enregistrer au format audio</div>';
        document.body.appendChild(ttsMenu);

        let ttsIsLoading = false;
        let ttsCachedBlob = null;
        let ttsCachedUrl = null;

        function ttsGetText() {
            const textEl = div.querySelector('.message-text');
            return textEl ? textEl.textContent : '';
        }

        function ttsReset() {
            ttsIcon.innerHTML = iconPlay;
            ttsBtn.title = 'Lire à haute voix';
            ttsIsLoading = false;
        }

        function ttsGenerate(callback) {
            if (ttsCachedBlob) { callback(ttsCachedBlob); return; }
            const text = ttsGetText();
            if (!text) return;
            ttsIsLoading = true;
            ttsIcon.innerHTML = iconLoading;
            ttsBtn.title = 'Chargement...';
            ttsSpeak(text, (blob, charCount) => {
                ttsIsLoading = false;
                ttsCachedBlob = blob;
                const ttsCost = (charCount / 1_000_000) * 30;
                totalAudioCost += ttsCost;
                addCostForModel('tts', 0, 0, ttsCost);
                updateTokenDisplay();
                saveConversation();
                callback(blob);
            }, (err) => {
                ttsReset();
                console.error('TTS error:', err);
                alert('Erreur TTS : ' + err.message);
            });
        }

        function ttsDoSpeak() {
            ttsGenerate((blob) => {
                if (ttsCachedUrl) URL.revokeObjectURL(ttsCachedUrl);
                ttsCachedUrl = URL.createObjectURL(blob);
                const audio = new Audio(ttsCachedUrl);
                currentTtsAudio = audio;
                ttsIcon.innerHTML = iconStop;
                ttsBtn.title = 'Arrêter la lecture';
                audio.onended = () => {
                    currentTtsAudio = null;
                    ttsReset();
                };
                audio.play();
            });
        }

        function ttsDoSave() {
            ttsGenerate((blob) => {
                ttsReset();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'kiro-audio.mp3';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        }

        ttsBtn.addEventListener('click', (e) => {
            if (e.target.closest('.copy-menu-item')) return;
            // Si un audio est en cours, l'arrêter
            if (currentTtsAudio) {
                currentTtsAudio.pause();
                currentTtsAudio.currentTime = 0;
                currentTtsAudio = null;
                document.querySelectorAll('.tts-icon').forEach(ic => { ic.innerHTML = iconPlay; });
                document.querySelectorAll('.message-tts-btn').forEach(b => { b.title = 'Lire à haute voix'; });
                return;
            }
            if (ttsIsLoading) return;
            document.querySelectorAll('.copy-menu.open').forEach(m => { if (m !== ttsMenu) m.classList.remove('open'); });
            document.querySelectorAll('.menu-open').forEach(b => b.classList.remove('menu-open'));
            ttsMenu.classList.toggle('open');
            ttsBtn.classList.toggle('menu-open', ttsMenu.classList.contains('open'));
            if (ttsMenu.classList.contains('open')) positionMenu(ttsMenu, ttsBtn);
            e.stopPropagation();
        });

        ttsMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.copy-menu-item');
            if (!item) return;
            e.stopPropagation();
            ttsMenu.classList.remove('open');
            ttsBtn.classList.remove('menu-open');
            if (item.dataset.mode === 'save') ttsDoSave();
            else ttsDoSpeak();
        });

        btnRow.appendChild(ttsBtn);
    }

    // Citations Perplexity
    if (citations && citations.length > 0) {
        appendCitations(div, citations);
    }

    // Wrapper pour positionner les boutons sous la bulle
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper message-wrapper-${role}`;
    wrapper.appendChild(div);
    wrapper.appendChild(btnRow);

    chatContainer.appendChild(wrapper);
    scrollToBottom();
    return div;
}

// --- Afficher le temps de génération sur le dernier message assistant ---
function formatGenTime(seconds) {
    if (seconds < 1) return '< 1s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function setGenTimeOnLastAssistant(seconds) {
    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length === 0) return;
    const lastWrapper = wrappers[wrappers.length - 1];
    const el = lastWrapper.querySelector('.message-gen-time');
    if (el) el.textContent = formatGenTime(seconds);
}

// --- Afficher les citations Perplexity sous un message ---
function appendCitations(messageDiv, citations) {
    const existing = messageDiv.querySelector('.citations-block');
    if (existing) existing.remove();
    if (!citations || citations.length === 0) return;

    const block = document.createElement('div');
    block.className = 'citations-block';

    const title = document.createElement('div');
    title.className = 'citations-title';
    title.textContent = 'Sources';
    block.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'citations-list';
    for (let i = 0; i < citations.length; i++) {
        const cit = citations[i];
        // Support format string (Perplexity) ou objet {url, title}
        const url = typeof cit === 'string' ? cit : cit.url;
        const citTitle = typeof cit === 'string' ? '' : (cit.title || '');
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        // Afficher le titre si disponible, sinon le domaine
        if (citTitle) {
            a.textContent = citTitle.length > 50 ? citTitle.substring(0, 50) + '...' : citTitle;
        } else {
            try {
                a.textContent = new URL(url).hostname.replace(/^www\./, '');
            } catch (e) {
                a.textContent = url;
            }
        }
        a.title = url;
        const num = document.createElement('span');
        num.className = 'citation-num';
        num.textContent = `[${i + 1}]`;
        li.appendChild(num);
        li.appendChild(a);
        list.appendChild(li);
    }
    block.appendChild(list);
    messageDiv.appendChild(block);
}

// --- Bouton régénérer ---
function removeRegenBtn() {
    document.querySelectorAll('.regen-btn').forEach(b => b.remove());
}

function addRegenBtn() {
    removeRegenBtn();
    if (conversationHistory.length < 2) return;
    const last = conversationHistory[conversationHistory.length - 1];
    if (last.role !== 'assistant') return;

    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length === 0) return;
    const lastWrapper = wrappers[wrappers.length - 1];
    const btnRow = lastWrapper.querySelector('.message-btn-row');
    if (!btnRow) return;

    const btn = document.createElement('button');
    btn.className = 'regen-btn';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
    btn.title = 'Régénérer la réponse';
    btn.addEventListener('click', regenerateLastResponse);
    btnRow.appendChild(btn);
}

function regenerateLastResponse() {
    if (isStreaming) return;
    // Retirer la dernière réponse assistant
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
        conversationHistory.pop();
    }
    // Retirer le wrapper du dernier message assistant + le bouton regen
    removeRegenBtn();
    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length > 0) {
        wrappers[wrappers.length - 1].remove();
    }

    // Re-générer
    isStreaming = true;
    currentAbortController = new AbortController();
    updateSendButton();

    const assistantDiv = addMessage('assistant', '');
    assistantDiv.classList.add('streaming');
    const regenStartTime = Date.now();

    if (currentImageModel) {
        const lastUserMsg = conversationHistory[conversationHistory.length - 1];
        const prompt = getTextFromContent(lastUserMsg.content);

        // Collecter les images de référence pour la régénération
        const regenRefImages = [];
        const regenAttachedIds = new Set();
        if (Array.isArray(lastUserMsg.content)) {
            for (const part of lastUserMsg.content) {
                if (part.type === 'image' && part.data) {
                    regenRefImages.push({ data: part.data, mimeType: part.mimeType });
                    regenAttachedIds.add(part.data);
                }
            }
        }
        for (let i = conversationHistory.length - 2; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (Array.isArray(msg.content)) {
                const imgs = msg.content.filter(p => p.type === 'image' && p.data && !regenAttachedIds.has(p.data));
                if (imgs.length > 0) {
                    for (const img of imgs) {
                        regenRefImages.push({ data: img.data, mimeType: img.mimeType });
                    }
                    break;
                }
            }
        }

        generateImage(
            currentImageModel,
            prompt,
            (result) => {
                assistantDiv.classList.remove('streaming');
                if (result.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.className = 'message-images';
                    for (const img of result.images) {
                        const imgWrap = document.createElement('div');
                        imgWrap.className = 'message-image-wrap';
                        const imgEl = document.createElement('img');
                        const src = `data:${img.mimeType};base64,${img.b64}`;
                        imgEl.src = src;
                        imgEl.alt = 'Image générée';
                        attachLightboxToImg(imgEl);
                        const dlBtn = document.createElement('button');
                        dlBtn.className = 'image-download-btn';
                        dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                        dlBtn.title = 'Télécharger';
                        dlBtn.addEventListener('click', () => { const a = document.createElement('a'); a.href = src; a.download = `kiro-image.${(img.mimeType||'image/png').split('/')[1]||'png'}`; a.click(); });
                        imgWrap.appendChild(imgEl);
                        imgWrap.appendChild(dlBtn);
                        imagesDiv.appendChild(imgWrap);
                    }
                    assistantDiv.insertBefore(imagesDiv, assistantDiv.firstChild);
                }
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl && result.text) { textEl.innerHTML = marked.parse(result.text); addCodeCopyButtons(textEl); } else if (textEl) { textEl.remove(); }
                const assistantContent = [];
                if (result.text) assistantContent.push({ type: 'text', text: result.text });
                for (const img of result.images) assistantContent.push({ type: 'image', data: img.b64, mimeType: img.mimeType });
                const regenSeconds = (Date.now() - regenStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: assistantContent.length === 1 && assistantContent[0].type === 'text' ? assistantContent[0].text : assistantContent, generationTime: regenSeconds });
                setGenTimeOnLastAssistant(regenSeconds);
                if (result.usage) { totalInputTokens += result.usage.input_tokens; totalOutputTokens += result.usage.output_tokens; }
                const imgTarif = getImageTarif(currentImageModel);
                let regenImgCost = 0;
                if (imgTarif) {
                    if (result.usage) {
                        const tc = (result.usage.input_tokens / 1_000_000) * imgTarif.inputPer1M + (result.usage.output_tokens / 1_000_000) * imgTarif.outputPer1M;
                        totalCost += tc; regenImgCost += tc;
                    }
                    if (result.imageCount > 0) { const ic = imgTarif.imageOutput * result.imageCount; totalImageCost += ic; regenImgCost += ic; }
                }
                addCostForModel(currentImageModel, result.usage?.input_tokens || 0, result.usage?.output_tokens || 0, regenImgCost);
                updateTokenDisplay(); saveConversation(); scrollToBottom(); addRegenBtn();
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.textContent = `Erreur : ${err.message}`; textEl.style.color = '#c00'; }
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            regenRefImages,
            currentAbortController.signal,
            document.getElementById('image-format-select').value
        );
    } else {
        let fullResponse = '';
        let fullThinking = '';
        const spContent = currentSystemPrompt ? currentSystemPrompt.contenu : null;
        const regenTextModel = currentModel || currentSearchModel;
        streamModel(
            regenTextModel,
            conversationHistory,
            (chunk) => {
                if (!fullResponse) { const tb = assistantDiv.querySelector('.thinking-block'); if (tb) tb.open = false; }
                fullResponse += chunk; const textEl = assistantDiv.querySelector('.message-text'); if (textEl) textEl.innerHTML = marked.parse(fullResponse); scrollToBottom();
            },
            (usage, citations) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    const _blocks = (typeof extractCodeBlocks === 'function') ? extractCodeBlocks(fullResponse) : [];
                    textEl.innerHTML = marked.parse(_blocks.length > 0 ? stripCodeBlocks(fullResponse) : fullResponse);
                    if (_blocks.length === 0) addCodeCopyButtons(textEl);
                    if (_blocks.length > 0 && typeof openCanvas === 'function') openCanvas(_blocks);
                }
                if (fullThinking.trim()) {
                    const thinkContent = assistantDiv.querySelector('.thinking-content');
                    if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                } else {
                    const emptyBlock = assistantDiv.querySelector('.thinking-block');
                    if (emptyBlock) emptyBlock.remove();
                }
                if (citations && citations.length > 0) appendCitations(assistantDiv, citations);
                const regenSeconds = (Date.now() - regenStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: fullResponse, citations: citations || undefined, generationTime: regenSeconds, thinking: fullThinking || undefined });
                setGenTimeOnLastAssistant(regenSeconds);
                if (usage) {
                    totalInputTokens += usage.input_tokens; totalOutputTokens += usage.output_tokens;
                    const segTarif = getTarif(regenTextModel) || getSearchTarif(regenTextModel);
                    let segCost = 0;
                    if (segTarif) {
                        segCost = (usage.input_tokens / 1_000_000) * segTarif.inputPer1M + (usage.output_tokens / 1_000_000) * segTarif.outputPer1M;
                        totalCost += segCost;
                    }
                    // Coût recherche web (PR10) : tarif par requête + citations selon provider
                    const wsCost = calcWebSearchCost(regenTextModel, citations);
                    if (wsCost > 0) {
                        totalCost += wsCost;
                        segCost += wsCost;
                    }
                    addCostForModel(regenTextModel, usage.input_tokens, usage.output_tokens, segCost);
                }
                updateTokenDisplay(); saveConversation(); addRegenBtn();
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.textContent = `Erreur : ${err.message}`; textEl.style.color = '#c00'; }
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            spContent,
            webSearchEnabled,
            (thinkChunk) => {
                fullThinking += thinkChunk;
                let thinkBlock = assistantDiv.querySelector('.thinking-block');
                if (!thinkBlock) {
                    const details = document.createElement('details');
                    details.className = 'thinking-block';
                    details.open = true;
                    const summary = document.createElement('summary');
                    summary.textContent = 'Raisonnement';
                    details.appendChild(summary);
                    const thinkContent = document.createElement('div');
                    thinkContent.className = 'thinking-content';
                    details.appendChild(thinkContent);
                    assistantDiv.insertBefore(details, assistantDiv.firstChild);
                    thinkBlock = details;
                }
                const thinkContent = thinkBlock.querySelector('.thinking-content');
                if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                scrollToBottom();
            },
            currentAbortController.signal
        );
    }
}

// --- Scroll automatique ---
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- Envoyer le message ---
function sendMessage() {
    const text = promptInput.value.trim();
    if ((!text && pendingImages.length === 0 && pendingFiles.length === 0) || isStreaming) return;

    removeRegenBtn();

    // Vérifier qu'un modèle est sélectionné
    if (!currentModel && !currentImageModel && !currentSearchModel) {
        showModelAlert();
        return;
    }

    // Initialiser la conversation si c'est le premier message
    if (!conversationId) {
        firstPrompt = text || '(image)';
        conversationStartTime = new Date().toISOString();
        conversationId = generateConversationId(firstPrompt);
    }

    // Verrouiller le system prompt dès le premier envoi (modèles restent déverrouillés)
    if (!conversationStarted) {
        conversationStarted = true;
        spSelect.disabled = true;
        if (spSelect.value) {
            const opt = spSelect.selectedOptions[0];
            const _sp = JSON.parse(localStorage.getItem('goudai-systemprompts')||'{}')[spSelect.value];
            currentSystemPrompt = { nom: opt.textContent, contenu: _sp ? _sp.contenu : '' };
        } else {
            currentSystemPrompt = null;
        }
    }

    // Construire le contenu du message (texte simple ou multimodal)
    let messageContent;
    if (pendingImages.length > 0 || pendingFiles.length > 0) {
        messageContent = [];
        if (text) {
            messageContent.push({ type: 'text', text });
        }
        for (const img of pendingImages) {
            const base64 = img.dataUrl.split(',')[1];
            messageContent.push({ type: 'image', data: base64, mimeType: img.mimeType, dataUrl: img.dataUrl });
        }
        for (const file of pendingFiles) {
            messageContent.push({ type: 'file', name: file.name, mimeType: file.mimeType, data: file.data, textContent: file.textContent });
        }
        pendingImages = [];
        pendingFiles = [];
        attachPreview.innerHTML = '';
    } else {
        messageContent = text;
    }

    // Afficher le message utilisateur
    addMessage('user', messageContent);
    conversationHistory.push({ role: 'user', content: messageContent });

    // Réinitialiser le champ de saisie
    promptInput.value = '';
    promptInput.style.height = 'auto';
    originalPromptBeforeEnhance = null;
    isStreaming = true;
    currentAbortController = new AbortController();
    updateSendButton();

    // Créer le bloc de réponse assistant
    const assistantDiv = addMessage('assistant', '');
    assistantDiv.classList.add('streaming');
    const genStartTime = Date.now();

    const activeTextModel = currentModel || currentSearchModel;

    if (currentImageModel) {
        // --- Mode génération d'image ---
        // Enrichir le prompt avec le contexte conversationnel
        let imagePrompt = text;
        const textMessages = conversationHistory.filter(m => m.role === 'user' || m.role === 'assistant');
        // S'il y a du contexte et que le prompt semble relatif (court ou référentiel)
        if (textMessages.length > 1) {
            const contextParts = [];
            // Prendre les derniers messages (hors le dernier qu'on vient d'ajouter)
            const recent = textMessages.slice(-6, -1);
            for (const m of recent) {
                const t = typeof m.content === 'string' ? m.content
                    : Array.isArray(m.content) ? m.content.filter(p => p.type === 'text').map(p => p.text).join(' ') : '';
                if (t) contextParts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${t.substring(0, 300)}`);
            }
            if (contextParts.length > 0) {
                imagePrompt = `Context of the conversation:\n${contextParts.join('\n')}\n\nImage request: ${text}`;
            }
        }

        // Collecter les images de référence : jointes dans ce message ET images précédentes de la conversation
        const referenceImages = [];
        // Images jointes dans le message courant (ex: un logo uploadé)
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        const attachedImageIds = new Set();
        if (Array.isArray(lastMsg.content)) {
            for (const part of lastMsg.content) {
                if (part.type === 'image' && part.data) {
                    referenceImages.push({ data: part.data, mimeType: part.mimeType });
                    attachedImageIds.add(part.data);
                }
            }
        }
        // Images précédentes dans la conversation (générées ou jointes), en remontant
        for (let i = conversationHistory.length - 2; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (Array.isArray(msg.content)) {
                const imgs = msg.content.filter(p => p.type === 'image' && p.data && !attachedImageIds.has(p.data));
                if (imgs.length > 0) {
                    for (const img of imgs) {
                        referenceImages.push({ data: img.data, mimeType: img.mimeType });
                    }
                    break;
                }
            }
        }

        generateImage(
            currentImageModel,
            imagePrompt,
            // onDone
            (result) => {
                assistantDiv.classList.remove('streaming');

                // Afficher les images générées
                if (result.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.className = 'message-images';
                    for (const img of result.images) {
                        const imgWrap = document.createElement('div');
                        imgWrap.className = 'message-image-wrap';

                        const imgEl = document.createElement('img');
                        const src = `data:${img.mimeType};base64,${img.b64}`;
                        imgEl.src = src;
                        imgEl.alt = 'Image générée';
                        attachLightboxToImg(imgEl);

                        const dlBtn = document.createElement('button');
                        dlBtn.className = 'image-download-btn';
                        dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                        dlBtn.title = 'Télécharger';
                        dlBtn.addEventListener('click', () => {
                            const a = document.createElement('a');
                            a.href = src;
                            const ext = (img.mimeType || 'image/png').split('/')[1] || 'png';
                            a.download = `kiro-image.${ext}`;
                            a.click();
                        });

                        imgWrap.appendChild(imgEl);
                        imgWrap.appendChild(dlBtn);
                        imagesDiv.appendChild(imgWrap);
                    }
                    assistantDiv.insertBefore(imagesDiv, assistantDiv.firstChild);
                }

                // Afficher le texte (revised_prompt ou texte accompagnant)
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl && result.text) {
                    textEl.innerHTML = marked.parse(result.text);
                    addCodeCopyButtons(textEl);
                } else if (textEl) {
                    textEl.remove();
                }

                // Construire le contenu pour l'historique
                const assistantContent = [];
                if (result.text) {
                    assistantContent.push({ type: 'text', text: result.text });
                }
                for (const img of result.images) {
                    assistantContent.push({ type: 'image', data: img.b64, mimeType: img.mimeType });
                }
                const genSeconds = (Date.now() - genStartTime) / 1000;
                conversationHistory.push({
                    role: 'assistant',
                    content: assistantContent.length === 1 && assistantContent[0].type === 'text'
                        ? assistantContent[0].text
                        : assistantContent,
                    generationTime: genSeconds
                });
                setGenTimeOnLastAssistant(genSeconds);

                // Coûts
                if (result.usage) {
                    totalInputTokens += result.usage.input_tokens;
                    totalOutputTokens += result.usage.output_tokens;
                }
                const imgTarif = getImageTarif(currentImageModel);
                let imgSegCost = 0;
                if (imgTarif) {
                    if (result.usage) {
                        const tokenCost = (result.usage.input_tokens / 1_000_000) * imgTarif.inputPer1M
                                        + (result.usage.output_tokens / 1_000_000) * imgTarif.outputPer1M;
                        totalCost += tokenCost;
                        imgSegCost += tokenCost;
                    }
                    if (result.imageCount > 0) {
                        const imgCost = imgTarif.imageOutput * result.imageCount;
                        totalImageCost += imgCost;
                        imgSegCost += imgCost;
                    }
                }
                addCostForModel(currentImageModel, result.usage?.input_tokens || 0, result.usage?.output_tokens || 0, imgSegCost);

                updateTokenDisplay();
                saveConversation();
                scrollToBottom();
                addRegenBtn();
                maybeGenerateTitle();

                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            // onError
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    textEl.textContent = `Erreur : ${err.message}`;
                    textEl.style.color = '#c00';
                }
                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            referenceImages,
            currentAbortController.signal,
            document.getElementById('image-format-select').value
        );
    } else {
        // --- Mode texte / recherche (streaming) ---
        let fullResponse = '';
        let fullThinking = '';
        const spContent = currentSystemPrompt ? currentSystemPrompt.contenu : null;

        streamModel(
            activeTextModel,
            conversationHistory,
            // onChunk
            (chunk) => {
                // Refermer le bloc de raisonnement quand la vraie réponse commence
                if (!fullResponse) {
                    const thinkBlock = assistantDiv.querySelector('.thinking-block');
                    if (thinkBlock) thinkBlock.open = false;
                }
                fullResponse += chunk;
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) textEl.innerHTML = marked.parse(fullResponse);
                scrollToBottom();
            },
            // onDone(usage, citations)
            (usage, citations) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    const _blocks = (typeof extractCodeBlocks === 'function') ? extractCodeBlocks(fullResponse) : [];
                    textEl.innerHTML = marked.parse(_blocks.length > 0 ? stripCodeBlocks(fullResponse) : fullResponse);
                    if (_blocks.length === 0) addCodeCopyButtons(textEl);
                    if (_blocks.length > 0 && typeof openCanvas === 'function') openCanvas(_blocks);
                }

                // Finaliser le bloc de raisonnement (ou le supprimer s'il est vide)
                if (fullThinking.trim()) {
                    const thinkContent = assistantDiv.querySelector('.thinking-content');
                    if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                } else {
                    const emptyBlock = assistantDiv.querySelector('.thinking-block');
                    if (emptyBlock) emptyBlock.remove();
                }

                // Afficher les citations Perplexity
                if (citations && citations.length > 0) {
                    appendCitations(assistantDiv, citations);
                }

                const genSeconds = (Date.now() - genStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: fullResponse, citations: citations || undefined, generationTime: genSeconds, thinking: fullThinking || undefined });
                setGenTimeOnLastAssistant(genSeconds);

                if (usage) {
                    totalInputTokens += usage.input_tokens;
                    totalOutputTokens += usage.output_tokens;
                    const segTarif = getTarif(activeTextModel) || getSearchTarif(activeTextModel);
                    let segCost = 0;
                    if (segTarif) {
                        segCost = (usage.input_tokens / 1_000_000) * segTarif.inputPer1M
                                + (usage.output_tokens / 1_000_000) * segTarif.outputPer1M;
                        totalCost += segCost;
                    }
                    // Coût recherche web (PR10) : tarif par requête + citations selon provider
                    const wsCost = calcWebSearchCost(activeTextModel, citations);
                    if (wsCost > 0) {
                        totalCost += wsCost;
                        segCost += wsCost;
                    }
                    addCostForModel(activeTextModel, usage.input_tokens, usage.output_tokens, segCost);
                }
                updateTokenDisplay();
                saveConversation();
                addRegenBtn();
                maybeGenerateTitle();

                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            // onError
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    textEl.textContent = `Erreur : ${err.message}`;
                    textEl.style.color = '#c00';
                }
                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            spContent,
            webSearchEnabled,
            // onThinkingChunk
            (thinkChunk) => {
                fullThinking += thinkChunk;
                // Créer le bloc dépliable s'il n'existe pas encore
                let thinkBlock = assistantDiv.querySelector('.thinking-block');
                if (!thinkBlock) {
                    const details = document.createElement('details');
                    details.className = 'thinking-block';
                    details.open = true;
                    const summary = document.createElement('summary');
                    summary.textContent = 'Raisonnement';
                    details.appendChild(summary);
                    const thinkContent = document.createElement('div');
                    thinkContent.className = 'thinking-content';
                    details.appendChild(thinkContent);
                    assistantDiv.insertBefore(details, assistantDiv.firstChild);
                    thinkBlock = details;
                }
                const thinkContent = thinkBlock.querySelector('.thinking-content');
                if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                scrollToBottom();
            },
            currentAbortController.signal
        );
    }
}

// --- Liste des conversations dans la sidebar ---
async function refreshConvList() {
    const conversations = await listConversationFiles();
    convList.innerHTML = '';
    for (const conv of conversations) {
        // Filtre catégorie
        if (activeCategoryId) {
            if (conv.category !== activeCategoryId) continue;
        } else {
            if (conv.category) continue;
        }

        const item = document.createElement('div');
        item.className = 'conv-item';
        item.dataset.filename = conv.filename;
        item.dataset.fulltext = conv.fullText || '';

        // Drag & drop
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', conv.filename);
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        const itemContent = document.createElement('div');
        itemContent.className = 'conv-item-content';

        const title = document.createElement('div');
        title.className = 'conv-item-title';
        if (conv.titre) {
            title.textContent = conv.titre;
        } else {
            const firstMsg = conv.firstMessage || '';
            const titleText = typeof firstMsg === 'string' ? firstMsg : getTextFromContent(firstMsg);
            title.textContent = titleText
                ? titleText.substring(0, 30) + (titleText.length > 30 ? '...' : '')
                : conv.id;
        }

        const dateLine = document.createElement('div');
        dateLine.className = 'conv-item-date-line';

        const date = document.createElement('span');
        date.className = 'conv-item-date';
        if (conv.date) {
            const d = new Date(conv.date);
            date.textContent = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        const renameBtn = document.createElement('button');
        renameBtn.className = 'conv-rename-btn';
        renameBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
        renameBtn.title = 'Renommer';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameConversation(conv.filename, title);
        });

        dateLine.appendChild(date);
        dateLine.appendChild(renameBtn);

        itemContent.appendChild(title);
        itemContent.appendChild(dateLine);

        // Bouton retirer de la catégorie
        if (activeCategoryId) {
            const uncatBtn = document.createElement('button');
            uncatBtn.className = 'conv-uncat-btn';
            uncatBtn.textContent = '\u2715';
            uncatBtn.title = 'Retirer de la catégorie';
            uncatBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await updateConversationCategory(conv.filename, null);
                // Si c'est la conversation active, mettre à jour
                const expectedFn = conversationId
                    ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                    : null;
                if (conv.filename === expectedFn) {
                    currentConversationCategory = null;
                }
                refreshConvList();
            });
            item.appendChild(uncatBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'conv-delete-btn';
        deleteBtn.textContent = '\u00D7';
        deleteBtn.title = 'Supprimer cette conversation';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConversation(conv.filename);
        });

        item.appendChild(itemContent);
        item.appendChild(deleteBtn);
        item.addEventListener('click', () => loadConversation(conv.filename));
        convList.appendChild(item);
    }
    highlightActiveConv();

    if (convSearch.value) {
        convSearch.dispatchEvent(new Event('input'));
    }
}

async function renameConversation(filename, titleEl) {
    const currentTitle = titleEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'conv-rename-input';
    input.value = currentTitle;
    titleEl.textContent = '';
    titleEl.appendChild(input);
    input.focus();
    input.select();

    const finish = async () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            // Mettre à jour dans IndexedDB
            const data = await readConversationFile(filename);
            if (data) {
                data.titre = newTitle;
                await writeConversationFile(filename, data);
            }
            // Mettre à jour la variable si c'est la conversation active
            const expectedFn = conversationId
                ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                : null;
            if (filename === expectedFn) {
                conversationTitle = newTitle;
            }
        }
        titleEl.textContent = newTitle || currentTitle;
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = currentTitle; input.blur(); }
    });
}

async function deleteConversation(filename) {
    if (!confirm('Supprimer cette conversation ?')) return;
    await deleteConversationFile(filename);
    const expectedFn = conversationId
        ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
        : null;
    if (filename === expectedFn) {
        resetConversation();
    }
    refreshConvList();
}

async function loadConversation(filename) {
    if (isStreaming) return;
    saveConversation();

    const data = await readConversationFile(filename);
    if (!data) return;

    // Restaurer l'état de la conversation
    conversationId = data.id;
    conversationTitle = data.titre || null;
    conversationStartTime = data.date;
    const savedModel = data.modele;
    conversationHistory = data.messages || [];
    totalInputTokens = data.tokens_entree || 0;
    totalOutputTokens = data.tokens_sortie || 0;
    totalCost = data.totalCost || 0;
    totalImageCost = data.cout_images || 0;
    totalAudioCost = data.cout_audio || 0;
    costByModel = data.cost_by_model || {};
    currentConversationCategory = data.category || null;
    firstPrompt = conversationHistory.length > 0 ? getTextFromContent(conversationHistory[0].content) : null;
    conversationStarted = conversationHistory.length > 0;

    // Déterminer si c'est un modèle texte, image ou recherche
    const isImageModel = IMAGE_MODELS.some(m => m.id === savedModel);
    const isSearchModel = SEARCH_MODELS.some(m => m.id === savedModel);
    if (isImageModel) {
        currentImageModel = savedModel;
        currentModel = null;
        currentSearchModel = null;
        imageModelSelect.value = savedModel;
        modelSelect.value = '';
        searchModelSelect.value = '';
    } else if (isSearchModel) {
        currentSearchModel = savedModel;
        currentModel = null;
        currentImageModel = null;
        searchModelSelect.value = savedModel;
        modelSelect.value = '';
        imageModelSelect.value = '';
    } else {
        currentModel = savedModel;
        currentImageModel = null;
        currentSearchModel = null;
        modelSelect.value = savedModel;
        imageModelSelect.value = '';
        searchModelSelect.value = '';
    }

    // Restaurer le system prompt
    if (data.system_prompt || data.systemPrompt) {
        const spName = data.system_prompt || data.systemPrompt;
        spSelect.value = '';
        for (const opt of spSelect.options) {
            if (opt.textContent === spName) { spSelect.value = opt.value; break; }
        }
        currentSystemPrompt = spSelect.value
            ? { nom: spName, contenu: spSelect.selectedOptions[0]?.dataset.contenu || '' }
            : { nom: spName, contenu: '' };
    } else {
        currentSystemPrompt = null;
        spSelect.value = '';
    }

    // Restaurer le modèle actif depuis le dernier model-switch
    const lastSwitch = [...conversationHistory].reverse().find(m => m.type === 'model-switch');
    if (lastSwitch) {
        const restoredModel = lastSwitch.to;
        const isImg = IMAGE_MODELS.some(m => m.id === restoredModel);
        const isSrch = SEARCH_MODELS.some(m => m.id === restoredModel);
        currentModel = null; currentImageModel = null; currentSearchModel = null;
        modelSelect.value = ''; imageModelSelect.value = ''; searchModelSelect.value = '';
        if (isImg) { currentImageModel = restoredModel; imageModelSelect.value = restoredModel; }
        else if (isSrch) { currentSearchModel = restoredModel; searchModelSelect.value = restoredModel; }
        else { currentModel = restoredModel; modelSelect.value = restoredModel; }
    }

    // Verrouiller uniquement le system prompt
    spSelect.disabled = conversationStarted;

    // Vider les pièces jointes en attente
    pendingImages = [];
    pendingFiles = [];
    attachPreview.innerHTML = '';

    // Réafficher les messages
    chatContainer.innerHTML = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            addModelSwitchElement(getModelLabel(msg.from), getModelLabel(msg.to));
        } else {
            addMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content, msg.citations, msg.generationTime, msg.thinking);
        }
    }

    updateTokenDisplay();
    updateSendButton();
    highlightActiveConv();
    updateExportMdBtn();
    addRegenBtn();
    promptInput.focus();

    // Canvas reopen btn
    if (typeof extractCodeBlocks === 'function') {
        closeCanvas();
        _canvasBlocksFromHistory = [];
        const assistantMsgs = conversationHistory.filter(m => m.role === 'assistant' && typeof m.content === 'string');
        for (let i = assistantMsgs.length - 1; i >= 0; i--) {
            const blocks = extractCodeBlocks(assistantMsgs[i].content);
            if (blocks.length > 0) { _canvasBlocksFromHistory = blocks; break; }
        }
        if (typeof updateCanvasReopenBtn === 'function') updateCanvasReopenBtn();
    }
}

function highlightActiveConv() {
    const items = convList.querySelectorAll('.conv-item');
    for (const item of items) {
        const fn = item.dataset.filename;
        const expectedFn = conversationId
            ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
            : null;
        item.classList.toggle('active', fn === expectedFn);
    }
}

// --- Rôles (System Prompts) : liste, modale, CRUD ---

async function refreshSpList() {
    const prompts = await listSystemPrompts();

    // Sidebar list
    spListEl.innerHTML = '';
    for (const sp of prompts) {
        const item = document.createElement('div');
        item.className = 'sp-item';

        const name = document.createElement('span');
        name.className = 'sp-item-name';
        name.textContent = sp.nom;

        const actions = document.createElement('div');
        actions.className = 'sp-item-actions';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'sp-item-btn';
        exportBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
        exportBtn.title = 'Exporter';
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportSpItem(sp.filename);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'sp-item-btn';
        editBtn.textContent = '\u270E';
        editBtn.title = 'Modifier';
        editBtn.addEventListener('click', () => openSpModal(sp.filename));

        const delBtn = document.createElement('button');
        delBtn.className = 'sp-item-btn delete';
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Supprimer';
        delBtn.addEventListener('click', () => deleteSpItem(sp.filename, sp.nom));

        actions.appendChild(exportBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(name);
        item.appendChild(actions);
        spListEl.appendChild(item);
    }

    // Select dropdown
    const prevValue = spSelect.value;
    spSelect.innerHTML = '<option value="">Aucun</option>';
    for (const sp of prompts) {
        const opt = document.createElement('option');
        opt.value = sp.filename;
        opt.textContent = sp.nom;
        opt.dataset.contenu = sp.contenu;
        spSelect.appendChild(opt);
    }
    spSelect.value = prevValue || '';
}

async function deleteSpItem(filename, nom) {
    if (!confirm(`Supprimer le rôle "${nom}" ?`) ) return;
    await deleteSystemPromptFile(filename);
    if (spSelect.value === filename) {
        spSelect.value = '';
        currentSystemPrompt = null;
    }
    refreshSpList();
}

async function exportSpItem(filename) {
    const data = await readSystemPrompt(filename);
    if (!data) return;
    const exportData = { _minou_role: true, nom: data.nom, contenu: data.contenu };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = data.nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `role-${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

const spImportBtn = document.getElementById('sp-import-btn');
const spImportFile = document.getElementById('sp-import-file');

spImportBtn.addEventListener('click', () => spImportFile.click());

spImportFile.addEventListener('change', async () => {
    const file = spImportFile.files[0];
    if (!file) return;
    spImportFile.value = '';
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._minou_role || !data.nom || !data.contenu) {
            showModelAlert('Ce fichier n\'est pas un rôle Kiro valide.');
            return;
        }
        const filename = data.nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
        await writeSystemPrompt(filename, { nom: data.nom, contenu: data.contenu });
        refreshSpList();
    } catch (e) {
        console.error('Erreur import rôle:', e);
        showModelAlert('Erreur lors de l\'import du rôle.');
    }
});

function openSpModal(filename = null) {
    spEditingFilename = filename;
    if (filename) {
        spModalTitle.textContent = 'Modifier le rôle';
        readSystemPrompt(filename).then(data => {
            if (data) {
                spModalNom.value = data.nom;
                spModalContenu.value = data.contenu;
            }
        });
    } else {
        spModalTitle.textContent = 'Nouveau rôle';
        spModalNom.value = '';
        spModalContenu.value = '';
    }
    spModalOverlay.style.display = 'flex';
    spModalNom.focus();
}

function closeSpModal() {
    spModalOverlay.style.display = 'none';
    spEditingFilename = null;
}

const spModalOptimize = document.getElementById('sp-modal-optimize');

spAddBtn.addEventListener('click', () => openSpModal());
spModalCancel.addEventListener('click', closeSpModal);

spModalOptimize.addEventListener('click', async () => {
    const contenu = spModalContenu.value.trim();
    if (!contenu) return;

    const originalText = spModalOptimize.textContent;
    spModalOptimize.disabled = true;
    spModalOptimize.textContent = 'Optimisation...';
    spModalContenu.value = '';

    try {
        const modelId = AUDIO_SETTINGS.roleOptimizeModel || 'claude-sonnet-4-5-20250929';
        const prompt = `Tu es un expert en prompt engineering. Voici un system prompt brut :\n\n---\n${contenu}\n---\n\nRéécris-le en une version optimisée, claire et structurée en markdown. Améliore la formulation, ajoute de la structure (titres, listes, emphases) pour le rendre plus efficace. Réponds UNIQUEMENT avec le system prompt amélioré, sans explication ni commentaire autour.`;

        await streamText(modelId, prompt, (text) => {
            spModalContenu.value += text;
            spModalContenu.style.height = 'auto';
            spModalContenu.style.height = spModalContenu.scrollHeight + 'px';
            spModalContenu.scrollTop = spModalContenu.scrollHeight;
        });
    } catch (e) {
        console.error('Erreur optimisation:', e);
        alert('Erreur lors de l\'optimisation : ' + e.message);
    } finally {
        spModalOptimize.disabled = false;
        spModalOptimize.textContent = originalText;
    }
});
spModalOverlay.addEventListener('click', (e) => {
    if (e.target === spModalOverlay) closeSpModal();
});

spModalSave.addEventListener('click', async () => {
    const nom = spModalNom.value.trim();
    const contenu = spModalContenu.value.trim();
    if (!nom || !contenu) return;

    const data = { nom, contenu };
    const filename = spEditingFilename || nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';

    if (spEditingFilename) {
        const oldData = await readSystemPrompt(spEditingFilename);
        if (oldData && oldData.nom !== nom) {
            const newFilename = nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
            if (newFilename !== spEditingFilename) {
                await writeSystemPrompt(newFilename, data);
                await deleteSystemPromptFile(spEditingFilename);
                closeSpModal();
                refreshSpList();
                return;
            }
        }
    }

    await writeSystemPrompt(filename, data);
    closeSpModal();
    refreshSpList();
});

// --- Prompts enregistrés : sidebar, modale, picker ---

async function refreshPrList() {
    const prompts = await listSavedPrompts();

    prListEl.innerHTML = '';
    for (const pr of prompts) {
        const item = document.createElement('div');
        item.className = 'sp-item';

        const name = document.createElement('span');
        name.className = 'sp-item-name';
        name.textContent = pr.nom;

        const actions = document.createElement('div');
        actions.className = 'sp-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'sp-item-btn';
        editBtn.textContent = '\u270E';
        editBtn.title = 'Modifier';
        editBtn.addEventListener('click', () => openPrModal(pr.filename));

        const delBtn = document.createElement('button');
        delBtn.className = 'sp-item-btn delete';
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Supprimer';
        delBtn.addEventListener('click', async () => {
            if (!confirm(`Supprimer le prompt "${pr.nom}" ?`)) return;
            await deleteSavedPrompt(pr.filename);
            refreshPrList();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(name);
        item.appendChild(actions);
        prListEl.appendChild(item);
    }
}

function openPrModal(filename = null, prefillContenu = '') {
    prEditingFilename = filename;
    if (filename) {
        prModalTitle.textContent = 'Modifier le Prompt';
        readSavedPrompt(filename).then(data => {
            if (data) {
                prModalNom.value = data.nom;
                prModalContenu.value = data.contenu;
            }
        });
    } else {
        prModalTitle.textContent = 'Enregistrer un Prompt';
        prModalNom.value = '';
        prModalContenu.value = prefillContenu;
    }
    prModalOverlay.style.display = 'flex';
    prModalNom.focus();
}

function closePrModal() {
    prModalOverlay.style.display = 'none';
    prEditingFilename = null;
}

prAddBtn.addEventListener('click', () => openPrModal());
prModalCancel.addEventListener('click', closePrModal);
prModalOverlay.addEventListener('click', (e) => {
    if (e.target === prModalOverlay) closePrModal();
});

prModalSave.addEventListener('click', async () => {
    const nom = prModalNom.value.trim();
    const contenu = prModalContenu.value.trim();
    if (!nom || !contenu) return;

    const data = { nom, contenu };
    const filename = prEditingFilename || nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';

    if (prEditingFilename) {
        const oldData = await readSavedPrompt(prEditingFilename);
        if (oldData && oldData.nom !== nom) {
            const newFilename = nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
            if (newFilename !== prEditingFilename) {
                await writeSavedPrompt(newFilename, data);
                await deleteSavedPrompt(prEditingFilename);
                closePrModal();
                refreshPrList();
                return;
            }
        }
    }

    await writeSavedPrompt(filename, data);
    closePrModal();
    refreshPrList();
});

// --- Prompt Picker (dropdown dans la zone de saisie) ---

promptPickerBtn.addEventListener('click', async () => {
    if (promptPickerDropdown.style.display !== 'none') {
        promptPickerDropdown.style.display = 'none';
        return;
    }
    const prompts = await listSavedPrompts();
    promptPickerDropdown.innerHTML = '';

    if (prompts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'prompt-picker-empty';
        empty.textContent = 'Aucun prompt enregistré';
        promptPickerDropdown.appendChild(empty);
    } else {
        for (const pr of prompts) {
            const item = document.createElement('div');
            item.className = 'prompt-picker-item';

            const name = document.createElement('div');
            name.className = 'prompt-picker-item-name';
            name.textContent = pr.nom;

            const preview = document.createElement('div');
            preview.className = 'prompt-picker-item-preview';
            preview.textContent = pr.contenu.substring(0, 80) + (pr.contenu.length > 80 ? '...' : '');

            item.appendChild(name);
            item.appendChild(preview);
            item.addEventListener('click', () => {
                const sep = promptInput.value && !promptInput.value.endsWith(' ') && !promptInput.value.endsWith('\n') ? ' ' : '';
                promptInput.value += sep + pr.contenu;
                promptInput.dispatchEvent(new Event('input'));
                promptPickerDropdown.style.display = 'none';
                promptInput.focus();
            });
            promptPickerDropdown.appendChild(item);
        }
    }
    promptPickerDropdown.style.display = '';
});

// Fermer le picker en cliquant ailleurs
document.addEventListener('click', (e) => {
    if (!promptPickerBtn.contains(e.target) && !promptPickerDropdown.contains(e.target)) {
        promptPickerDropdown.style.display = 'none';
    }
});

// --- Micro : dictée vocale via Whisper ---
const micIconDefault = micBtn.innerHTML;
const micIconStop = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
const micIconLoading = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

let micStream = null;

micBtn.addEventListener('click', async () => {
    // Si en cours d'enregistrement, arrêter
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
    }

    // Garde-fou : refuser de capturer l'audio si la clé API du provider STT est absente.
    // Évite de gaspiller un enregistrement qui finirait en 401.
    const sttProvider = AUDIO_SETTINGS.sttProvider || 'openai';
    if (!API_KEYS[sttProvider]) {
        alert(`Clé API ${sttProvider} manquante — configurez-la dans les réglages avant d'utiliser le micro.`);
        return;
    }

    try {
        if (!micStream || !micStream.active) {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        mediaRecorder = new MediaRecorder(micStream);
        micChunks = [];
        micStartTime = Date.now();

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) micChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const durationMin = (Date.now() - micStartTime) / 60000;
            const blob = new Blob(micChunks, { type: 'audio/webm' });
            micBtn.innerHTML = micIconLoading;
            micBtn.classList.remove('recording');

            transcribeAudio(blob, (text) => {
                micBtn.innerHTML = micIconDefault;
                promptInput.value += (promptInput.value && !promptInput.value.endsWith(' ') ? ' ' : '') + text;
                promptInput.dispatchEvent(new Event('input'));

                // Coût STT dynamique : lookup dans MODELS_DATA.stt selon le provider configuré.
                // Format prix attendu : "$0.006/min" → on extrait le float.
                const sttModel = MODELS_DATA.stt.find(m => m.editeur === sttProvider);
                const pricePerMin = sttModel?.prix?.includes('/min')
                    ? parseFloat(sttModel.prix.replace(/[^0-9.]/g, ''))
                    : 0;
                const sttCost = durationMin * (Number.isFinite(pricePerMin) ? pricePerMin : 0);
                totalAudioCost += sttCost;
                addCostForModel('stt', 0, 0, sttCost);
                updateTokenDisplay();
                if (conversationId) saveConversation();
            }, (err) => {
                micBtn.innerHTML = micIconDefault;
                console.error('STT error:', err);
                alert('Erreur transcription : ' + err.message);
            });
        };

        mediaRecorder.start();
        micBtn.innerHTML = micIconStop;
        micBtn.classList.add('recording');
    } catch (err) {
        console.error('Mic error:', err);
        alert('Impossible d\u2019accéder au microphone.');
    }
});

// --- Export / Import ---
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

exportBtn.addEventListener('click', async () => {
    try {
        const convList = await listConversationFilesWithMeta();
        const conversations = {};
        for (const conv of convList) {
            try {
                const data = await readConversationFile(conv.filename);
                if (data) conversations[conv.filename] = data;
            } catch(e) {}
        }
        const data = {
            _goudai_backup: true,
            date: new Date().toISOString(),
            conversations: conversations,
            systemPrompts: JSON.parse(localStorage.getItem('goudai-systemprompts') || '{}'),
            savedPrompts: JSON.parse(localStorage.getItem('goudai-savedprompts') || '{}'),
            categories: JSON.parse(localStorage.getItem('goudai-categories') || '{}'),
            theme: localStorage.getItem('goudai-theme') || 'dark'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'goudai-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        alert('Erreur export : ' + e.message);
    }
});

importBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files[0];
    if (!file) return;
    importFileInput.value = '';

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data._minou_backup && !data._goudai_backup) {
            showModelAlert('Ce fichier n\'est pas une sauvegarde valide.');
            return;
        }

        const convCount = data.conversations ? Object.keys(data.conversations).length : 0;
        const spCount = data.systemPrompts ? Object.keys(data.systemPrompts).length : 0;
        const prCount = data.savedPrompts ? Object.keys(data.savedPrompts).length : 0;
        const catCount = data.categories ? Object.keys(data.categories).length : 0;

        if (!confirm(`Importer ${convCount} conversation(s), ${spCount} rôle(s), ${prCount} prompt(s) enregistré(s) et ${catCount} catégorie(s) ?\n\nLes données existantes portant les mêmes noms seront écrasées.`)) return;

        // Importer les conversations dans IndexedDB
        if (data.conversations) {
            const db = await openConvDB();
            for (const [key, val] of Object.entries(data.conversations)) {
                const tx = db.transaction('conversations', 'readwrite');
                tx.objectStore('conversations').put(val, key);
                await new Promise(r => { tx.oncomplete = r; });
            }
        }

        // Importer les system prompts
        if (data.systemPrompts) {
            const existing = JSON.parse(localStorage.getItem('goudai-systemprompts') || '{}');
            Object.assign(existing, data.systemPrompts);
            localStorage.setItem('goudai-systemprompts', JSON.stringify(existing));
        }

        // Importer les prompts enregistrés
        if (data.savedPrompts) {
            const existing = JSON.parse(localStorage.getItem('goudai-savedprompts') || '{}');
            Object.assign(existing, data.savedPrompts);
            localStorage.setItem('goudai-savedprompts', JSON.stringify(existing));
        }

        // Importer les clés API
        if (data.apiKeys && Object.keys(data.apiKeys).length > 0) {
            saveApiKeys(data.apiKeys);
        }

        // Importer les catégories
        if (data.categories) {
            const existing = JSON.parse(localStorage.getItem('goudai-categories') || '{}');
            Object.assign(existing, data.categories);
            localStorage.setItem('goudai-categories', JSON.stringify(existing));
        }

        // Rafraîchir l'interface
        refreshConvList();
        refreshCatBar();
        refreshSpList();
        refreshPrList();
        showModelAlert('Import terminé avec succès !');
    } catch (e) {
        console.error('Erreur import:', e);
        showModelAlert('Erreur lors de l\'import : fichier invalide.');
    }
});

// --- Dashboard Statistiques ---
const dashboardBtn = document.getElementById('dashboard-btn');
const dashboardOverlay = document.getElementById('dashboard-modal-overlay');
const dashboardClose = document.getElementById('dashboard-close');
const dashboardContent = document.getElementById('dashboard-content');
let dashboardData = null;

dashboardBtn.addEventListener('click', openDashboard);
dashboardClose.addEventListener('click', closeDashboard);
dashboardOverlay.addEventListener('click', (e) => {
    if (e.target === dashboardOverlay) closeDashboard();
});

document.querySelectorAll('.dashboard-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderDashboardTab(tab.dataset.tab);
    });
});

async function listAllConvStats() {
    return listConversationFiles(true);
}

async function openDashboard() {
    dashboardData = await listAllConvStats();
    const activeTab = document.querySelector('.dashboard-tab.active');
    renderDashboardTab(activeTab ? activeTab.dataset.tab : 'periodes');
    dashboardOverlay.style.display = 'flex';
}

function closeDashboard() {
    dashboardOverlay.style.display = 'none';
}

// --- Modale Config (clés API) ---
apikeysBtn.addEventListener('click', openApiKeysModal);
apikeysModalCancel.addEventListener('click', closeApiKeysModal);
apikeysModalSave.addEventListener('click', saveApiKeysFromModal);

// Onglets de la modale
// apikeys-tab: desactive si elements absents
if (document.querySelector('.apikeys-tab')) {
    document.querySelectorAll('.apikeys-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.apikeys-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.apikeys-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('panel-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });
}
apikeysModalOverlay.addEventListener('click', (e) => {
    if (e.target === apikeysModalOverlay) closeApiKeysModal();
});

document.querySelectorAll('.apikey-toggle-vis').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// Bouton mise à jour modèles locaux
document.getElementById('apikey-local-refresh').addEventListener('click', async () => {
    const status = document.getElementById('apikey-local-status');
    const url = document.getElementById('apikey-local').value.trim();
    if (!url) { status.textContent = 'Entrez une URL.'; status.className = 'apikey-local-status error'; return; }
    API_KEYS.local = url;
    status.textContent = 'Récupération…'; status.className = 'apikey-local-status';
    try {
        await fetchLocalModels();
        populateModelSelect();
        const count = MODELS.filter(m => m.editeur === 'local').length;
        status.textContent = count > 0 ? `✓ ${count} modèle${count > 1 ? 's' : ''} ${count > 1 ? 'locaux' : 'local'} chargé${count > 1 ? 's' : ''}` : '✓ Connecté — aucun modèle chargé';
        status.className = 'apikey-local-status success';
    } catch (e) {
        status.textContent = '✗ Impossible de se connecter. Vérifiez que le serveur est lancé.';
        status.className = 'apikey-local-status error';
    }
});

function populateModelSelects() {
    const fillByEditeur = (selectId, category, currentValue) => {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        if (!MODELS_DATA[category]) return;
        for (const m of MODELS_DATA[category]) {
            const opt = document.createElement('option');
            opt.value = m.editeur;
            const cost = m.prix ? ` — ${m.prix}` : '';
            opt.textContent = m.label + cost;
            select.appendChild(opt);
        }
        select.value = currentValue;
        if (select.value !== currentValue) select.selectedIndex = 0;
    };
    const fillByModelId = (selectId, category, currentValue) => {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        // Grouper par éditeur dans l'ordre d'apparition
        const groups = [];
        const seen = new Set();
        if (!MODELS_DATA[category]) return;
        for (const m of MODELS_DATA[category]) {
            if (!seen.has(m.editeur)) { seen.add(m.editeur); groups.push(m.editeur); }
        }
        for (const ed of groups) {
            const sep = document.createElement('option');
            sep.disabled = true;
            sep.textContent = `── ${EDITEUR_LABELS[ed] || ed} ──`;
            select.appendChild(sep);
            for (const m of (MODELS_DATA[category]||[]).filter(m => m.editeur === ed)) {
                const opt = document.createElement('option');
                opt.value = m.id;
                const cost = (m.inputPer1M !== undefined) ? ` — $${m.inputPer1M} / $${m.outputPer1M}` : '';
                opt.textContent = m.label + cost;
                select.appendChild(opt);
            }
        }
        // Option serveur local (LM Studio, Ollama…)
        if (API_KEYS.local) {
            const sep = document.createElement('option');
            sep.disabled = true;
            sep.textContent = '── Local ──';
            select.appendChild(sep);
            const opt = document.createElement('option');
            opt.value = '__local__';
            opt.textContent = 'Utiliser le modèle chargé — Gratuit';
            select.appendChild(opt);
        }
        select.value = currentValue;
    };
    fillByEditeur('audio-tts-provider', 'tts', AUDIO_SETTINGS.ttsProvider || 'openai');
    fillByEditeur('audio-stt-provider', 'stt', AUDIO_SETTINGS.sttProvider || 'openai');
    fillByModelId('enhance-provider', 'text', AUDIO_SETTINGS.enhanceModel || 'gpt-4.1-2025-04-14');
    fillByModelId('summary-model', 'text', AUDIO_SETTINGS.summaryModel || 'gpt-4.1-2025-04-14');
    fillByModelId('role-optimize-model', 'text', AUDIO_SETTINGS.roleOptimizeModel || 'claude-sonnet-4-5-20250929');
}

function openApiKeysModal() {
    try {
    document.getElementById('apikey-openai').value = API_KEYS.openai || '';
    document.getElementById('apikey-anthropic').value = API_KEYS.anthropic || '';
    document.getElementById('apikey-google').value = API_KEYS.google || '';
    document.getElementById('apikey-perplexity').value = API_KEYS.perplexity || '';
    const _mEl = document.getElementById('apikey-mistral'); if (_mEl) _mEl.value = API_KEYS.mistral || '';
    const _gEl = document.getElementById('apikey-grok'); if (_gEl) _gEl.value = API_KEYS.grok || '';
    const _dEl = document.getElementById('apikey-deepseek'); if (_dEl) _dEl.value = API_KEYS.deepseek || '';
    const _lEl = document.getElementById('apikey-local'); if (_lEl) _lEl.value = API_KEYS.local || '';
    (document.getElementById('apikey-local-status')||{style:{},textContent:'',className:'',checked:false,value:''}).textContent = '';
    (document.getElementById('apikey-local-status')||{style:{},textContent:'',className:'',checked:false,value:''}).className = 'apikey-local-status';
    (document.getElementById('models-error')||{style:{},textContent:'',className:'',checked:false,value:''}).style.display = 'none';
    populateModelSelects();
    // Charger les réglages budget
    const budget = loadBudgetSettings();
    (document.getElementById('budget-enabled')||{style:{},textContent:'',className:'',checked:false,value:''}).checked = budget.enabled;
    (document.getElementById('budget-period')||{style:{},textContent:'',className:'',checked:false,value:''}).value = budget.period;
    (document.getElementById('budget-amount')||{style:{},textContent:'',className:'',checked:false,value:''}).value = budget.amount || '';
    (document.getElementById('budget-settings')||{style:{},textContent:'',className:'',checked:false,value:''}).style.display = budget.enabled ? '' : 'none';
    if (budget.enabled) updateBudgetPreview();
    // Reset sur le premier onglet
    document.querySelectorAll('.apikeys-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.apikeys-panel').forEach(p => p.classList.remove('active'));
    const _activeTab = document.querySelector('.apikeys-tab[data-tab="keys"]');
    if (_activeTab) _activeTab.classList.add('active');
    const _panelKeys = document.getElementById('panel-keys');
    if (_panelKeys) _panelKeys.classList.add('active');
    apikeysModalOverlay.style.display = 'flex';
    } catch(e) { console.error('openApiKeysModal ERROR:', e); alert('Erreur: ' + e.message); }
}

function closeApiKeysModal() {
    apikeysModalOverlay.style.display = 'none';
}

function saveApiKeysFromModal() {
    const keys = {
        openai: document.getElementById('apikey-openai').value.trim(),
        anthropic: document.getElementById('apikey-anthropic').value.trim(),
        google: document.getElementById('apikey-google').value.trim(),
        perplexity: document.getElementById('apikey-perplexity').value.trim(),
        mistral: document.getElementById('apikey-mistral')?.value.trim() || '',
        grok: document.getElementById('apikey-grok')?.value.trim() || '',
        deepseek: document.getElementById('apikey-deepseek')?.value.trim() || '',
        local: document.getElementById('apikey-local')?.value.trim() || ''
    };
    const tts = document.getElementById('audio-tts-provider').value;
    const stt = document.getElementById('audio-stt-provider').value;
    const enhance = document.getElementById('enhance-provider').value;
    const summary = document.getElementById('summary-model').value;
    const roleOptimize = document.getElementById('role-optimize-model').value;

    // Validation : vérifier que les clés nécessaires sont renseignées
    const errEl = document.getElementById('models-error');
    const getEditeurForModel = (val) => {
        if (val === '__local__') return 'local';
        const m = MODELS_DATA.text.find(m => m.id === val);
        return m?.editeur || 'openai';
    };
    const checks = [
        { label: 'Synthèse vocale', editeur: tts },
        { label: 'Transcription', editeur: stt },
        { label: 'Amélioration de prompts', editeur: getEditeurForModel(enhance) },
        { label: 'Résumé IA', editeur: getEditeurForModel(summary) },
        { label: 'Optimisation de rôle', editeur: getEditeurForModel(roleOptimize) },
    ];
    // Validation désactivée - on sauvegarde sans bloquer
    if (typeof errEl !== 'undefined' && errEl && errEl.style) errEl.style.display = 'none';

    saveApiKeys(keys);
    saveAudioSettings({ ttsProvider: tts, sttProvider: stt, enhanceModel: enhance, summaryModel: summary, roleOptimizeModel: roleOptimize });
    // Sauvegarder le budget
    saveBudgetSettings();
    // Rafraîchir les modèles locaux puis le dropdown
    fetchLocalModels().then(() => populateModelSelect());
    closeApiKeysModal();
}

// --- Budget ---

function loadBudgetSettings() {
    try {
        const stored = localStorage.getItem('goudai-budget');
        return stored ? JSON.parse(stored) : { enabled: false, period: 'month', amount: 10 };
    } catch { return { enabled: false, period: 'month', amount: 10 }; }
}

function saveBudgetSettings() {
    const enabled = (document.getElementById('budget-enabled')||{style:{},textContent:'',className:'',checked:false,value:''}).checked;
    const period = (document.getElementById('budget-period')||{style:{},textContent:'',className:'',checked:false,value:''}).value;
    const amount = parseFloat((document.getElementById('budget-amount')||{style:{},textContent:'',className:'',checked:false,value:''}).value) || 0;
    localStorage.setItem('goudai-budget', JSON.stringify({ enabled, period, amount }));
}

function toggleBudgetSettings() {
    const on = (document.getElementById('budget-enabled')||{style:{},textContent:'',className:'',checked:false,value:''}).checked;
    (document.getElementById('budget-settings')||{style:{},textContent:'',className:'',checked:false,value:''}).style.display = on ? '' : 'none';
    saveBudgetSettings();
    if (on) updateBudgetPreview();
}

function getCostForPeriod(convs, period) {
    const now = new Date();
    let filter;
    if (period === 'day') {
        const todayStr = now.toISOString().slice(0, 10);
        filter = c => c.date && c.date.slice(0, 10) === todayStr;
    } else if (period === 'week') {
        const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
        filter = c => c.date && new Date(c.date) >= d7;
    } else {
        const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
        filter = c => c.date && new Date(c.date) >= d30;
    }
    return convs.filter(filter).reduce((s, c) => s + (c.cout_estime_usd || 0), 0);
}

const PERIOD_LABELS = { day: "aujourd'hui", week: 'cette semaine', month: 'ce mois' };

async function updateBudgetPreview() {
    const budget = loadBudgetSettings();
    const preview = document.getElementById('budget-preview');
    if (!budget.enabled || !budget.amount || budget.amount <= 0) { preview.style.display = 'none'; return; }

    const convs = await listAllConvStats();
    const spent = getCostForPeriod(convs, budget.period);
    const pct = Math.min((spent / budget.amount) * 100, 100);
    const color = pct < 75 ? '#10b981' : pct < 100 ? '#f59e0b' : '#ef4444';

    document.getElementById('budget-fill').style.width = pct + '%';
    document.getElementById('budget-fill').style.background = color;
    document.getElementById('budget-text').textContent = `$${spent.toFixed(4)} / $${budget.amount.toFixed(2)} ${PERIOD_LABELS[budget.period]} (${pct.toFixed(0)}%)`;
    preview.style.display = '';
}

function getBudgetPeriodId(period) {
    const now = new Date();
    if (period === 'day') return now.toISOString().slice(0, 10);
    if (period === 'month') return now.toISOString().slice(0, 7);
    if (period === 'week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        return 'week-' + firstDay.toISOString().slice(0, 10);
    }
    return 'default';
}

async function checkBudgetAlert() {
    const budget = loadBudgetSettings();
    if (!budget.enabled || !budget.amount || budget.amount <= 0) return;

    const periodId = getBudgetPeriodId(budget.period);
    const acknowledged = localStorage.getItem('kiro-budget-ack-' + periodId);
    if (acknowledged === 'true') return;

    const convs = await listAllConvStats();
    const spent = getCostForPeriod(convs, budget.period);
    if (spent >= budget.amount) {
        document.getElementById('budget-alert-text').innerHTML = `Budget dépassé ${PERIOD_LABELS[budget.period]}<br><strong>$${spent.toFixed(2)} / $${budget.amount.toFixed(2)}</strong>`;
        document.getElementById('budget-alert-overlay').style.display = 'flex';
    }
}

document.getElementById('budget-alert-close').addEventListener('click', () => {
    const budget = loadBudgetSettings();
    const periodId = getBudgetPeriodId(budget.period);
    localStorage.setItem('kiro-budget-ack-' + periodId, 'true');
    document.getElementById('budget-alert-overlay').style.display = 'none';
});

(document.getElementById('budget-enabled')||{style:{},textContent:'',className:'',checked:false,value:''}).addEventListener('change', toggleBudgetSettings);
(document.getElementById('budget-period')||{style:{},textContent:'',className:'',checked:false,value:''}).addEventListener('change', () => {
    saveBudgetSettings();
    updateBudgetPreview();
});
(document.getElementById('budget-amount')||{style:{},textContent:'',className:'',checked:false,value:''}).addEventListener('input', () => {
    saveBudgetSettings();
    updateBudgetPreview();
});

function addCostForModel(modelId, inputTokens, outputTokens, cost) {
    if (!modelId) return;
    if (!costByModel[modelId]) costByModel[modelId] = { input: 0, output: 0, cost: 0 };
    costByModel[modelId].input += inputTokens;
    costByModel[modelId].output += outputTokens;
    costByModel[modelId].cost += cost;
}

function fmtTokens(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
}

function fmtCost(n) {
    return '$' + n.toFixed(4);
}

const CHART_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#6366f1','#14b8a6'];

function buildBarChart(title, rows, colorFn) {
    // rows: [{ label, value, formatted }]
    if (rows.length === 0) return '';
    const max = Math.max(...rows.map(r => r.value), 0.0001);
    let html = `<div class="dashboard-chart"><div class="dashboard-chart-title">${title}</div><div class="dashboard-bar-chart">`;
    rows.forEach((r, i) => {
        const pct = (r.value / max) * 100;
        const color = colorFn ? colorFn(r, i) : CHART_COLORS[i % CHART_COLORS.length];
        html += `<div class="dashboard-bar-row">
            <span class="dashboard-bar-label" title="${r.label}">${r.label}</span>
            <div class="dashboard-bar-track"><div class="dashboard-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="dashboard-bar-value">${r.formatted}</span>
        </div>`;
    });
    html += '</div></div>';
    return html;
}

function renderDashboardTab(tab) {
    if (!dashboardData) return;
    const convs = dashboardData;
    if (convs.length === 0) {
        dashboardContent.innerHTML = '<div class="dashboard-empty">Aucune conversation enregistrée.</div>';
        return;
    }
    switch (tab) {
        case 'periodes': renderPeriodes(convs); break;
        case 'conversations': renderConversations(convs.filter(c => !c.deleted)); break;
        case 'modeles': renderModeles(convs); break;
        case 'editeurs': renderEditeurs(convs); break;
        case 'categories': renderDashCategories(convs); break;
    }
}

function renderPeriodes(convs) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

    const periods = [
        { label: "Aujourd'hui", filter: c => c.date && c.date.slice(0, 10) === todayStr },
        { label: '7 derniers jours', filter: c => c.date && new Date(c.date) >= d7 },
        { label: '30 derniers jours', filter: c => c.date && new Date(c.date) >= d30 },
        { label: 'Total', filter: () => true }
    ];

    let html = '<table class="dashboard-table"><thead><tr><th>Période</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const p of periods) {
        const filtered = convs.filter(p.filter);
        const tin = filtered.reduce((s, c) => s + c.tokens_entree, 0);
        const tout = filtered.reduce((s, c) => s + c.tokens_sortie, 0);
        const cost = filtered.reduce((s, c) => s + c.cout_estime_usd, 0);
        html += `<tr><td>${p.label}</td><td class="num">${filtered.length}</td><td class="num">${fmtTokens(tin)}</td><td class="num">${fmtTokens(tout)}</td><td class="num">${fmtCost(cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    // Graphique par mois
    const months = {};
    for (const c of convs) {
        if (!c.date) continue;
        const key = c.date.slice(0, 7); // YYYY-MM
        if (!months[key]) months[key] = { cost: 0, count: 0 };
        months[key].cost += c.cout_estime_usd;
        months[key].count++;
    }
    const monthRows = Object.entries(months)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .reverse()
        .map(([m, d]) => {
            const [y, mo] = m.split('-');
            const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
            return { label, value: d.cost, formatted: fmtCost(d.cost) };
        });

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par mois', monthRows);

    const monthConvRows = Object.entries(months)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .reverse()
        .map(([m, d]) => {
            const [y, mo] = m.split('-');
            const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
            return { label, value: d.count, formatted: String(d.count) };
        });
    html += buildBarChart('Conversations par mois', monthConvRows, () => '#10b981');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderConversations(convs) {
    let html = '<table class="dashboard-table"><thead><tr><th>Titre</th><th>Modèle</th><th>Date</th><th class="num">Tokens</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const c of convs) {
        const titre = c.titre || c.id || '—';
        const modele = (c.cost_by_model && Object.keys(c.cost_by_model).length > 0)
            ? Object.keys(c.cost_by_model).filter(m => m !== 'tts' && m !== 'stt').join(', ') || c.modele || '—'
            : (c.modele || '—');
        const date = c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—';
        const tokens = c.tokens_entree + c.tokens_sortie;
        html += `<tr><td title="${titre.length > 40 ? titre : ''}">${titre.length > 40 ? titre.substring(0, 37) + '...' : titre}</td><td>${modele}</td><td>${date}</td><td class="num">${fmtTokens(tokens)}</td><td class="num">${fmtCost(c.cout_estime_usd)}</td></tr>`;
    }
    html += '</tbody></table>';

    // Top 10 par coût
    const top = [...convs].sort((a, b) => b.cout_estime_usd - a.cout_estime_usd).slice(0, 10);
    const topRows = top.map(c => ({
        label: (c.titre || c.id || '?').substring(0, 20),
        value: c.cout_estime_usd,
        formatted: fmtCost(c.cout_estime_usd)
    }));

    // Top 10 par tokens
    const topTokens = [...convs].sort((a, b) => (b.tokens_entree + b.tokens_sortie) - (a.tokens_entree + a.tokens_sortie)).slice(0, 10);
    const topTokenRows = topTokens.map(c => ({
        label: (c.titre || c.id || '?').substring(0, 20),
        value: c.tokens_entree + c.tokens_sortie,
        formatted: fmtTokens(c.tokens_entree + c.tokens_sortie)
    }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Top 10 — coût', topRows, () => '#ef4444');
    html += buildBarChart('Top 10 — tokens', topTokenRows, () => '#8b5cf6');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderModeles(convs) {
    const map = {};
    for (const c of convs) {
        if (c.cost_by_model && Object.keys(c.cost_by_model).length > 0) {
            for (const [modelId, stats] of Object.entries(c.cost_by_model)) {
                if (!map[modelId]) map[modelId] = { count: 0, tin: 0, tout: 0, cost: 0 };
                map[modelId].count++;
                map[modelId].tin += stats.input || 0;
                map[modelId].tout += stats.output || 0;
                map[modelId].cost += stats.cost || 0;
            }
        } else {
            const m = c.modele || 'inconnu';
            if (!map[m]) map[m] = { count: 0, tin: 0, tout: 0, cost: 0 };
            map[m].count++;
            map[m].tin += c.tokens_entree;
            map[m].tout += c.tokens_sortie;
            map[m].cost += c.cout_estime_usd;
        }
    }
    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Modèle</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [model, d] of rows) {
        html += `<tr><td>${model}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([m, d]) => ({ label: m, value: d.cost, formatted: fmtCost(d.cost) }));
    const convRows = rows.sort((a, b) => b[1].count - a[1].count).map(([m, d]) => ({ label: m, value: d.count, formatted: String(d.count) }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par modèle', costRows);
    html += buildBarChart('Conversations par modèle', convRows, () => '#10b981');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderEditeurs(convs) {
    const map = {};
    for (const c of convs) {
        if (c.cost_by_model && Object.keys(c.cost_by_model).length > 0) {
            for (const [modelId, stats] of Object.entries(c.cost_by_model)) {
                const editeur = getModelEditeur(modelId) || getImageModelEditeur(modelId) || getSearchModelEditeur(modelId) || 'inconnu';
                if (!map[editeur]) map[editeur] = { count: 0, tin: 0, tout: 0, cost: 0 };
                map[editeur].count++;
                map[editeur].tin += stats.input || 0;
                map[editeur].tout += stats.output || 0;
                map[editeur].cost += stats.cost || 0;
            }
        } else {
            const editeur = getModelEditeur(c.modele) || getImageModelEditeur(c.modele) || getSearchModelEditeur(c.modele) || 'inconnu';
            if (!map[editeur]) map[editeur] = { count: 0, tin: 0, tout: 0, cost: 0 };
            map[editeur].count++;
            map[editeur].tin += c.tokens_entree;
            map[editeur].tout += c.tokens_sortie;
            map[editeur].cost += c.cout_estime_usd;
        }
    }
    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Éditeur</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [editeur, d] of rows) {
        html += `<tr><td>${editeur.charAt(0).toUpperCase() + editeur.slice(1)}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([e, d]) => ({ label: e.charAt(0).toUpperCase() + e.slice(1), value: d.cost, formatted: fmtCost(d.cost) }));
    const convRows = [...rows].sort((a, b) => b[1].count - a[1].count).map(([e, d]) => ({ label: e.charAt(0).toUpperCase() + e.slice(1), value: d.count, formatted: String(d.count) }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par éditeur', costRows);
    html += buildBarChart('Conversations par éditeur', convRows, () => '#f59e0b');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderDashCategories(convs) {
    const cats = listCategories();
    const map = {};
    // Initialiser avec toutes les catégories existantes
    for (const cat of cats) {
        map[cat.id] = { nom: cat.nom, icone: cat.icone, couleur: cat.couleur, count: 0, tin: 0, tout: 0, cost: 0 };
    }
    map['_none'] = { nom: 'Non classées', icone: '—', couleur: '#888', count: 0, tin: 0, tout: 0, cost: 0 };

    for (const c of convs) {
        const key = c.category || '_none';
        if (!map[key]) { map[key] = { nom: key, icone: '?', couleur: '#888', count: 0, tin: 0, tout: 0, cost: 0 }; }
        map[key].count++;
        map[key].tin += c.tokens_entree;
        map[key].tout += c.tokens_sortie;
        map[key].cost += c.cout_estime_usd;
    }

    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Catégorie</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [, d] of rows) {
        html += `<tr><td>${d.icone} ${d.nom}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([, d]) => ({ label: d.icone + ' ' + d.nom, value: d.cost, formatted: fmtCost(d.cost), color: d.couleur }));
    const convRows = [...rows].sort((a, b) => b[1].count - a[1].count).map(([, d]) => ({ label: d.icone + ' ' + d.nom, value: d.count, formatted: String(d.count), color: d.couleur }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par catégorie', costRows, (r) => r.color);
    html += buildBarChart('Conversations par catégorie', convRows, (r) => r.color);
    html += '</div>';

    dashboardContent.innerHTML = html;
}

// --- Bouton copier sur chaque bloc de code ---
function stripCodeBlocks(markdown) {
    return markdown.replace(/```(\w+)?\s*\n[\s\S]*?```/g, (match) => {
        const lang = (match.match(/```(\w+)/) || ['',''])[1] || 'code';
        const icons = {html:'🌐',css:'🎨',js:'⚡',javascript:'⚡',json:'📋',python:'🐍',py:'🐍'};
        const icon = icons[lang] || '📄';
        return '\n<span class="canvas-inline-badge">' + icon + ' <strong>' + lang + '</strong> — ouvert dans le Canvas →</span>\n';
    }).trim();
}

function addCodeCopyButtons(container) {
    const pres = container.querySelectorAll('pre');
    for (const pre of pres) {
        if (pre.querySelector('.code-copy-btn')) continue;
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = 'Copier';
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = 'Copié !';
                setTimeout(() => { btn.textContent = 'Copier'; }, 1500);
            });
        });
        pre.appendChild(btn);
    }
}

// --- Lightbox images ---
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

function openLightbox(src) {
    lightboxImg.src = src;
    lightboxOverlay.style.display = 'flex';
}

function closeLightbox() {
    lightboxOverlay.style.display = 'none';
    lightboxImg.src = '';
}

if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) closeLightbox();
    });
    lightboxClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxOverlay.style.display !== 'none') closeLightbox();
    });
}

function attachLightboxToImg(imgEl) {
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', () => openLightbox(imgEl.src));
}

// Focus initial
promptInput.focus();

// ── Canvas functions ──────────────────────────────────────────────
function extractCodeBlocks(markdown) {
    const blocks = [];
    const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match, idx = 0;
    const canvasLangs = ['html','css','js','javascript','json','python','py','typescript','ts','jsx','tsx','xml','svg','markdown','md','sql','bash','sh','yaml','yml','php','java','c','cpp'];
    while ((match = regex.exec(markdown)) !== null) {
        const lang = (match[1] || 'text').toLowerCase();
        const content = match[2];
        if (content.trim().length < 15 || !canvasLangs.includes(lang)) continue;
        idx++;
        const extMap = {html:'index.html',css:'style.css',js:'script.js',javascript:'script.js',json:'data.json',python:'script.py',py:'script.py',ts:'script.ts',typescript:'script.ts',jsx:'app.jsx',tsx:'app.tsx',md:'README.md',markdown:'README.md',sql:'query.sql',bash:'script.sh',sh:'script.sh',yaml:'config.yml',yml:'config.yml'};
        const ext = extMap[lang] || ('file.' + lang);
        blocks.push({ id: 'cv-' + Date.now() + '-' + idx, lang, content: content.trimEnd(), versions: [], filename: idx > 1 ? ext.replace(/\./, '-' + idx + '.') : ext });
    }
    return blocks;
}

function openCanvas(blocks) {
    if (!blocks || !blocks.length) return;
    const panel = document.getElementById('canvas-panel');
    if (!panel) return;
    if (typeof canvasState !== 'undefined') {
        for (const b of blocks) {
            const ex = canvasState.tabs.find(t => t.filename === b.filename);
            if (ex) { ex.versions.unshift({content:ex.content,ts:new Date().toISOString()}); ex.content = b.content; }
            else canvasState.tabs.push(b);
        }
        canvasState.activeTab = blocks[blocks.length-1].id;
        const at = canvasState.tabs.find(t => t.id === canvasState.activeTab);
        canvasState.view = (at && ['html','svg'].includes(at.lang)) ? 'preview' : 'code';
        canvasState.editMode = false; canvasState.open = true;
        if (typeof renderCanvas === 'function') renderCanvas();
    }
    panel.classList.add('open');
    document.querySelector('.main')?.classList.add('canvas-open');
    document.getElementById('canvas-reopen-btn') && (document.getElementById('canvas-reopen-btn').style.display = 'none');
}

function closeCanvas() {
    if (typeof canvasState !== 'undefined') canvasState.open = false;
    document.getElementById('canvas-panel')?.classList.remove('open');
    document.querySelector('.main')?.classList.remove('canvas-open');
    const btn = document.getElementById('canvas-reopen-btn');
    if (btn && _canvasBlocksFromHistory.length > 0) btn.style.display = '';
}

function updateCanvasReopenBtn() {
    document.getElementById('canvas-reopen-btn')?.remove();
    if (!_canvasBlocksFromHistory || !_canvasBlocksFromHistory.length) return;
    const btn = document.createElement('button');
    btn.id = 'canvas-reopen-btn'; btn.className = 'canvas-reopen-fab';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ' + _canvasBlocksFromHistory.length + ' fichier' + (_canvasBlocksFromHistory.length > 1 ? 's' : '');
    btn.addEventListener('click', () => { openCanvas(_canvasBlocksFromHistory); btn.style.display = 'none'; });
    (document.querySelector('.chat-wrapper') || document.querySelector('.main'))?.appendChild(btn);
}

// PWA iOS
(function() {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isIOS || window.navigator.standalone) return;
    if (localStorage.getItem("pwa-ios-shown")) return;
    setTimeout(function() {
        var d = document.createElement("div");
        d.style.cssText = "position:fixed;bottom:80px;left:12px;right:12px;background:#1a1724;border:1px solid #c9a84c;border-radius:12px;padding:14px;z-index:99999;color:#e0d0b0;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,0.6);display:flex;align-items:center;gap:10px";
        var closeBtn = document.createElement("button");
        closeBtn.textContent = "×"; closeBtn.style.cssText = "background:none;border:none;color:#c9a84c;font-size:22px;cursor:pointer";
        closeBtn.onclick = function() { d.remove(); localStorage.setItem("pwa-ios-shown","1"); };
        var icon = document.createElement("span"); icon.textContent = "📱"; icon.style.fontSize = "22px";
        var text = document.createElement("span"); text.style.flex = "1";
        text.innerHTML = "Installez GoudAI : <b>Partager</b> → <b>Sur l'écran d'accueil</b>";
        d.appendChild(icon); d.appendChild(text); d.appendChild(closeBtn);
        document.body.appendChild(d);
    }, 1500);
})();

