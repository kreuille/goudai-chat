// js/auth.js — Gestion session, clés API, déconnexion
// Chargé AVANT app.js sur app.html

const KIRO_API = ''; // même origine (nginx proxy)

// ── Vérifier si l'user est connecté ──────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch(`${KIRO_API}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = '/';
      return null;
    }
    return await res.json();
  } catch {
    window.location.href = '/';
    return null;
  }
}

// ── Charger les clés API depuis le serveur ────────────────────────
async function loadApiKeysFromServer() {
  try {
    const res = await fetch(`${KIRO_API}/api/user/keys`, { credentials: 'include' });
    if (!res.ok) return {};
    const { keys } = await res.json();
    return keys || {};
  } catch {
    return {};
  }
}

// ── Sauvegarder les clés API sur le serveur ───────────────────────
async function saveApiKeysRemote(keysObj) {
  try {
    const res = await fetch(`${KIRO_API}/api/user/keys`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysObj),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Déconnexion ───────────────────────────────────────────────────
async function logout() {
  await fetch(`${KIRO_API}/auth/logout`, { method: 'POST', credentials: 'include' });
  window.location.href = '/';
}

// ── Inject user info + logout button in sidebar ───────────────────
// Refonte P1.4 : tous les inline styles + onmouseover/out remplaces
// par les classes .user-widget* dans css/style.css. Ne plus modifier
// inline ici, ajuster le CSS dedie.
function mountUserWidget(user) {
  const sidebarBottom = document.querySelector('.sidebar-bottom');
  if (!sidebarBottom) return;

  const initial = (user.username || 'U')[0].toUpperCase();
  const avatarHtml = user.avatar_url
    ? `<img class="user-widget__avatar" src="${user.avatar_url}" alt="">`
    : `<div class="user-widget__avatar user-widget__avatar--initial">${initial}</div>`;

  const wrap = document.createElement('div');
  wrap.id = 'user-widget';
  wrap.className = 'user-widget';
  wrap.innerHTML = `
    ${avatarHtml}
    <div class="user-widget__info">
      <div class="user-widget__name">${user.username || 'Utilisateur'}</div>
      <div class="user-widget__email">${user.email || ''}</div>
    </div>
    <button class="user-widget__logout" onclick="logout()" title="Déconnexion" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  `;
  sidebarBottom.insertBefore(wrap, sidebarBottom.firstChild);
}

// ── Init : vérifie auth + charge clés API ─────────────────────────
window.__goudaiUser = null;
window.__goudaiApiKeys = {};

(async () => {
  const user = await checkAuth();
  if (!user) return;
  window.__goudaiUser = user;

  // Charger les clés API
  const keys = await loadApiKeysFromServer();
  window.__goudaiApiKeys = keys;

  // Pré-remplir localStorage pour que app.js les trouve (rétrocompat)
  if (keys && typeof keys === "object" && Object.keys(keys).length > 0) {
    localStorage.setItem('goudai-apikeys', JSON.stringify(keys));
    // Fix sync: api.js initConfig() a déjà run (race condition), donc
    // API_KEYS a été chargé depuis un localStorage potentiellement vide.
    // On force la mise à jour directe + re-trigger les decouvertes dynamiques
    // qui dependent des cles (OpenRouter K4, serveur local K6).
    if (typeof window.API_KEYS === 'object') {
      Object.assign(window.API_KEYS, keys);
      // Re-trigger les merges asynchrones si l'utilisateur a configure
      // openrouter ou un serveur local (auto-discovery des modeles).
      const promises = [];
      if (keys.openrouter && typeof mergeOpenRouterTextModels === 'function') {
        promises.push(mergeOpenRouterTextModels().catch(() => {}));
      }
      if (keys.local && typeof mergeLocalModels === 'function') {
        promises.push(mergeLocalModels().catch(() => {}));
      }
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          if (typeof populateModelSelect === 'function') populateModelSelect();
        });
      }
    }
    window.dispatchEvent(new CustomEvent('goudai-keys-ready', { detail: keys }));
  }

  // Sync rôles, prompts, catégories — migration auto + chargement serveur
  if (typeof loadUserDataFromServer === 'function') {
    // 1. Lire ce qui est en localStorage (peut contenir des données non encore sync)
    const _localRoles  = JSON.parse(localStorage.getItem('goudai-systemprompts') || '{}');
    const _localPrompts = JSON.parse(localStorage.getItem('goudai-savedprompts') || '{}');
    const _localCats   = JSON.parse(localStorage.getItem('goudai-categories') || '{}');

    // 2. Charger ce que le serveur a
    const _res = await fetch('/api/userdata', { credentials: 'include' });
    const _srv = _res.ok ? await _res.json() : { roles: {}, prompts: {}, categories: {} };

    // 3. Merger : serveur + localStorage (localStorage complète ce qui manque sur le serveur)
    const _mergedRoles  = Object.assign({}, _localRoles,  _srv.roles   || {});
    const _mergedPrompts = Object.assign({}, _localPrompts, _srv.prompts  || {});
    const _mergedCats   = Object.assign({}, _localCats,   _srv.categories || {});

    // 4. Sauvegarder le merge complet sur le serveur
    await fetch('/api/userdata', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: _mergedRoles, prompts: _mergedPrompts, categories: _mergedCats })
    });

    // 5. Mettre à jour localStorage avec le merge final
    localStorage.setItem('goudai-systemprompts', JSON.stringify(_mergedRoles));
    localStorage.setItem('goudai-savedprompts',  JSON.stringify(_mergedPrompts));
    localStorage.setItem('goudai-categories',    JSON.stringify(_mergedCats));

    console.log('[Sync] Migration auto ✓', Object.keys(_mergedRoles).length, 'rôles,', Object.keys(_mergedPrompts).length, 'prompts');
    window.dispatchEvent(new CustomEvent('goudai-userdata-ready'));
  }

  // Monter le widget user quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountUserWidget(user));
  } else {
    mountUserWidget(user);
  }
})();
