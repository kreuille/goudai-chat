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
function mountUserWidget(user) {
  const sidebarBottom = document.querySelector('.sidebar-bottom');
  if (!sidebarBottom) return;

  const wrap = document.createElement('div');
  wrap.id = 'user-widget';
  wrap.innerHTML = `
    <div style="
      display:flex; align-items:center; gap:10px; padding:10px 8px 8px;
      border-top:1px solid var(--border); margin-bottom:4px;
    ">
      ${user.avatar_url
        ? `<img src="${user.avatar_url}" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;border:1px solid var(--border)" alt="">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--accent-soft);border:1px solid var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:600;color:var(--accent);flex-shrink:0;">${(user.username||'U')[0].toUpperCase()}</div>`
      }
      <div style="min-width:0;flex:1">
        <div style="font-size:.78rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.username || 'Utilisateur'}</div>
        <div style="font-size:.65rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.email || ''}</div>
      </div>
      <button onclick="logout()" title="Déconnexion" style="
        background:none;border:none;cursor:pointer;padding:4px;color:var(--text-muted);
        border-radius:6px;transition:color .15s,background .15s;flex-shrink:0;
      " onmouseover="this.style.color='var(--accent)';this.style.background='var(--accent-soft)'"
         onmouseout="this.style.color='var(--text-muted)';this.style.background='none'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
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
