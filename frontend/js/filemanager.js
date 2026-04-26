// js/filemanager.js — Conversations + Rôles + Prompts + Catégories via serveur
// Tout est synchronisé server-side → fonctionne sur tous les appareils

// KIRO_API déclaré dans auth.js ('' = même origine)

// ═══════════════════════════════════════════════════════════════════
// ── CONVERSATIONS via API serveur ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

async function writeConversationFile(filename, content) {
  try {
    let data;
    if (typeof content === 'string') {
      try { data = JSON.parse(content); } catch { data = content; }
    } else {
      data = content;
    }
    const res = await fetch(`${KIRO_API}/api/conversations/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.error('writeConversationFile error:', e);
    return false;
  }
}

async function listConversationFiles() {
  try {
    const res = await fetch(`${KIRO_API}/api/conversations`, { credentials: 'include' });
    if (!res.ok) return [];
    const { conversations } = await res.json();
    return (conversations || []).map(f => ({
      filename: f.name,
      id: f.name.replace('.json', ''),
      titre: null, date: f.modifiedTime, modele: null,
      firstMessage: '', tokens_entree: 0, tokens_sortie: 0,
      cout_estime_usd: 0, fullText: '', category: null, _driveId: f.id,
    }));
  } catch (e) {
    console.error('listConversationFiles error:', e);
    return [];
  }
}

async function listConversationFilesWithMeta() {
  try {
    const res = await fetch(`${KIRO_API}/api/conversations`, { credentials: 'include' });
    if (!res.ok) return [];
    const { conversations } = await res.json();
    const results = [];
    const batch = conversations.slice(0, 50);
    await Promise.allSettled(batch.map(async (f) => {
      try {
        const r2 = await fetch(`${KIRO_API}/api/conversations/${encodeURIComponent(f.name)}`, { credentials: 'include' });
        if (!r2.ok) return;
        const data = await r2.json();
        let fullText = '';
        if (data.messages) {
          for (const msg of data.messages) {
            if (typeof msg.content === 'string') fullText += msg.content + ' ';
            else if (Array.isArray(msg.content)) {
              for (const p of msg.content) if (p.type === 'text') fullText += p.text + ' ';
            }
          }
        }
        results.push({
          filename: f.name,
          id: data.id || f.name.replace('.json', ''),
          titre: data.titre || null, date: data.date || f.modifiedTime,
          modele: data.modele, firstMessage: data.messages?.[0]?.content || '',
          tokens_entree: data.tokens_entree || 0, tokens_sortie: data.tokens_sortie || 0,
          cout_estime_usd: data.cout_estime_usd || 0,
          fullText: fullText.toLowerCase(), category: data.category || null,
        });
      } catch {}
    }));
    results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return results;
  } catch (e) {
    console.error('listConversationFilesWithMeta error:', e);
    return [];
  }
}

async function readConversationFile(filename) {
  try {
    const res = await fetch(`${KIRO_API}/api/conversations/${encodeURIComponent(filename)}`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('readConversationFile error:', e);
    return null;
  }
}

async function deleteConversationFile(filename) {
  try {
    const res = await fetch(`${KIRO_API}/api/conversations/${encodeURIComponent(filename)}`, {
      method: 'DELETE', credentials: 'include',
    });
    return res.ok;
  } catch (e) {
    console.error('deleteConversationFile error:', e);
    return false;
  }
}

async function openConvDB() {
  return {
    transaction: () => ({
      objectStore: () => ({
        getAllKeys: () => ({ onsuccess: null, onerror: null }),
        get: () => ({ onsuccess: null, onerror: null }),
      }),
      oncomplete: null,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════
// ── USERDATA : cache local + sync serveur ──────────────────────────
// ═══════════════════════════════════════════════════════════════════
// On garde localStorage comme cache rapide pour l'affichage instantané
// et on sync avec le serveur à chaque modification.

// Charger userdata depuis le serveur au démarrage (appelé dans auth.js initApp)
async function loadUserDataFromServer() {
  try {
    const res = await fetch(`${KIRO_API}/api/userdata`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    // Écrire dans localStorage comme cache
    if (data.roles)      localStorage.setItem('goudai-systemprompts', JSON.stringify(data.roles));
    if (data.prompts)    localStorage.setItem('goudai-savedprompts',  JSON.stringify(data.prompts));
    if (data.categories) localStorage.setItem('goudai-categories',    JSON.stringify(data.categories));
    console.log('[Sync] Userdata chargé depuis le serveur ✓');
  } catch (e) {
    console.warn('[Sync] Impossible de charger userdata depuis le serveur:', e.message);
  }
}

// Sync un changement vers le serveur (non bloquant)
function _syncToServer(endpoint, body) {
  fetch(`${KIRO_API}/api/userdata/${endpoint}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(e => console.warn('[Sync] Erreur sync serveur:', e.message));
}

// ═══════════════════════════════════════════════════════════════════
// ── RÔLES (System Prompts) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const SP_STORAGE_KEY = 'goudai-systemprompts';
function _getSpStore() { try { return JSON.parse(localStorage.getItem(SP_STORAGE_KEY)) || {}; } catch { return {}; } }
function _saveSpStore(s) { localStorage.setItem(SP_STORAGE_KEY, JSON.stringify(s)); }

async function listSystemPrompts() {
  const store = _getSpStore();
  return Object.entries(store)
    .map(([filename, data]) => ({ filename, nom: data.nom, contenu: data.contenu }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

async function readSystemPrompt(filename) {
  return _getSpStore()[filename] || null;
}

async function writeSystemPrompt(filename, data) {
  const s = _getSpStore();
  s[filename] = { nom: data.nom, contenu: data.contenu };
  _saveSpStore(s);
  // Sync serveur
  _syncToServer('roles', { filename, data: { nom: data.nom, contenu: data.contenu } });
  return true;
}

async function deleteSystemPromptFile(filename) {
  const s = _getSpStore();
  delete s[filename];
  _saveSpStore(s);
  // Sync serveur
  _syncToServer('roles', { filename, deleted: true });
  return true;
}

async function importDefaultSystemPrompts() {
  const s = _getSpStore();
  if (Object.keys(s).length > 0) return;
  s['sympote.json'] = { nom: 'sympote', contenu: "tu es mon pote, on s'écrit un peu en langage sms, cool, friendly, marrant." };
  _saveSpStore(s);
  _syncToServer('roles', { filename: 'sympote.json', data: s['sympote.json'] });
}

// ═══════════════════════════════════════════════════════════════════
// ── PROMPTS ENREGISTRÉS ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const PROMPT_STORAGE_KEY = 'goudai-savedprompts';
function _getPromptStore() { try { return JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY)) || {}; } catch { return {}; } }
function _savePromptStore(s) { localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(s)); }

async function listSavedPrompts() {
  const store = _getPromptStore();
  return Object.entries(store)
    .map(([filename, data]) => ({ filename, nom: data.nom, contenu: data.contenu }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

async function readSavedPrompt(filename) { return _getPromptStore()[filename] || null; }

async function writeSavedPrompt(filename, data) {
  const s = _getPromptStore();
  s[filename] = { nom: data.nom, contenu: data.contenu };
  _savePromptStore(s);
  _syncToServer('prompts', { filename, data: { nom: data.nom, contenu: data.contenu } });
  return true;
}

async function deleteSavedPrompt(filename) {
  const s = _getPromptStore();
  delete s[filename];
  _savePromptStore(s);
  _syncToServer('prompts', { filename, deleted: true });
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// ── CATÉGORIES ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const CAT_STORAGE_KEY = 'goudai-categories';
function _getCatStore() { try { return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY)) || {}; } catch { return {}; } }
function _saveCatStore(s) { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(s)); }

function listCategories() {
  return Object.entries(_getCatStore())
    .map(([id, data]) => ({ id, nom: data.nom, couleur: data.couleur, icone: data.icone }));
}

function readCategory(id) { return _getCatStore()[id] || null; }

function writeCategory(id, data) {
  const s = _getCatStore();
  s[id] = { nom: data.nom, couleur: data.couleur, icone: data.icone };
  _saveCatStore(s);
  _syncToServer('categories', { id, data: { nom: data.nom, couleur: data.couleur, icone: data.icone } });
}

function deleteCategory(id) {
  const s = _getCatStore();
  delete s[id];
  _saveCatStore(s);
  _syncToServer('categories', { id, deleted: true });
}

async function updateConversationCategory(filename, categoryId) {
  const data = await readConversationFile(filename);
  if (!data) return;
  if (categoryId) data.category = categoryId;
  else delete data.category;
  await writeConversationFile(filename, data);
}

// ═══════════════════════════════════════════════════════════════════
// ── FORMAT CONVERSATION ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function formatConversationFile(data) {
  const imgCost   = data.totalImageCost || 0;
  const audioCost = data.totalAudioCost || 0;
  const extraCost = imgCost + audioCost;
  let cost = null;
  if (data.totalCost != null) {
    cost = Math.round((data.totalCost + extraCost) * 10000) / 10000;
  } else {
    const tarif = (typeof getTarif === 'function' && getTarif(data.model)) ||
                  (typeof getImageTarif === 'function' && getImageTarif(data.model)) ||
                  (typeof getSearchTarif === 'function' && getSearchTarif(data.model));
    if (tarif) {
      cost = (data.totalInputTokens / 1_000_000) * tarif.inputPer1M
           + (data.totalOutputTokens / 1_000_000) * tarif.outputPer1M
           + extraCost;
      cost = Math.round(cost * 10000) / 10000;
    } else if (extraCost > 0) {
      cost = Math.round(extraCost * 10000) / 10000;
    }
  }
  const obj = {
    id: data.id, titre: data.title || null, modele: data.model,
    date: data.startTime, tokens_entree: data.totalInputTokens,
    tokens_sortie: data.totalOutputTokens, totalCost: data.totalCost || 0,
    cout_images: imgCost, cout_audio: audioCost, cout_estime_usd: cost,
    messages: data.messages,
  };
  if (data.systemPrompt) obj.system_prompt = data.systemPrompt;
  if (data.category) obj.category = data.category;
  return JSON.stringify(obj, null, 2);
}
