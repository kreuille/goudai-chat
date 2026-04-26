---
name: goudai-code-standards
description: "Standards de code pour GoudAI Chat. Utilise ce skill pour toute écriture ou modification de code dans le projet : nouvelle fonctionnalité, route API, module frontend, ou quand on se demande comment nommer, structurer, ou organiser quelque chose. Déclenche sur : 'comment je structure ça', 'écris-moi une fonction pour', 'ajoute une route', 'crée un nouveau module', 'quelle convention utiliser'."
---

# Standards de code — GoudAI Chat

## Réalité du codebase (lire avant de coder)

- **Frontend** : Vanilla JS ES2020, **pas de bundler, pas de modules ES** — tout est global dans `window`
- **Backend** : Node.js 20+, CommonJS (`require/module.exports`), Express.js
- **Pas de TypeScript**, pas de JSDoc obligatoire mais bienvenu sur les fonctions complexes
- Le frontend utilise `var`, `const` et `let` en mélange — préférer `const`/`let` pour le nouveau code

---

## Backend (Node.js / Express)

### Structure des routes

```javascript
// routes/conversations.js — pattern en place dans le projet
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Valider les inputs
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Logique dans les services, pas ici
    const conv = await getConversation(id, req.user.id);
    if (!conv) return res.status(404).json({ error: 'Introuvable' });

    res.json(conv);
  } catch (err) {
    console.error('[conversations] GET /:id error:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

module.exports = router;
```

### Conventions Backend

- **Logs** : toujours préfixer `[nom-module]` → `console.error('[auth] JWT verify failed:', err.message)`
- **Async/await** partout, pas de `.then().catch()`
- **Logique métier** dans `services/`, jamais dans les routes
- **Erreurs** : distinguer 400 (erreur client) vs 500 (erreur serveur) — ne jamais retourner un 500 pour une erreur de validation
- **require()** en haut du fichier, pas inline

---

## Frontend (Vanilla JS)

### Conventions globales

Le frontend n'a pas de bundler. Tout ce qui est déclaré dans un fichier est global.

```javascript
// Constantes globales en SCREAMING_SNAKE_CASE
const MAX_ATTACH_SIZE = 10 * 1024 * 1024;  // 10 MB
const DEFAULT_MODEL   = 'claude-sonnet-4-5';

// Fonctions nommées (pas arrow functions) pour les fonctions importantes
async function sendMessage() { /* ... */ }
function addMessage(role, content) { /* ... */ }

// Arrow functions pour les callbacks courts
const textModels = MODELS.filter(m => m.editeur === 'anthropic');
```

### Pattern "Safe getElementById" — déjà en place

`app.js` contient un proxy `Safe getElementById` qui évite les crashes si un élément DOM est absent. **Ne pas recréer ce pattern** — utiliser simplement `document.getElementById()`.

### Organisation des sections dans app.js

Les sections sont séparées par des commentaires `// --- Titre ---` ou `// ── Titre ──`. Respecter ce pattern pour les nouvelles sections :

```javascript
// --- Nom de la nouvelle section ---
const monElement = document.getElementById('mon-element');

function maFonction() {
  // ...
}
```

### Appels serveur depuis le frontend

```javascript
// Pattern standard — toujours passer par cette structure
async function saveApiKeysRemote(keys) {
  try {
    const response = await fetch('/api/user/apikeys', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ keys })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erreur ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('[api] saveApiKeysRemote:', err.message);
    // Ne pas throw si c'est non-bloquant (sync silencieuse)
  }
}
```

### Manipulation du DOM

```javascript
// Pour du texte utilisateur — textContent, JAMAIS innerHTML
element.textContent = userInput;

// Pour du Markdown rendu (réponses IA) — toujours passer par DOMPurify
element.innerHTML = DOMPurify.sanitize(marked.parse(markdownContent));

// Créer des éléments proprement
const div = document.createElement('div');
div.className = 'message message--user';
div.setAttribute('data-id', conversationId);
chatContainer.appendChild(div);
```

### localStorage — clés utilisées dans le projet

| Clé | Contenu |
|-----|---------|
| `goudai-apikeys` | JSON des clés API (toutes les providers) |
| `goudai-theme` | `'dark'` ou `'light'` |
| `goudai-audio-settings` | JSON des paramètres TTS/STT |
| `goudai-budget` | JSON des paramètres de budget |

---

## CSS

- **Toujours** utiliser les variables CSS du design system KIRO (voir `goudai-ui`)
- **Pas de valeurs en dur** : pas de `#c4881e` directement, utiliser `var(--accent)`
- **BEM loose** pour les nouveaux composants : `.block`, `.block__element`, `.block--modifier`
- Les breakpoints mobiles : `@media (max-width: 768px)` (référence du projet)

---

## Versioning du cache navigateur

**Règle absolue** : après toute modification d'un fichier JS ou CSS, incrémenter la version dans `frontend/app.html` :

```html
<!-- Avant -->
<script src="js/app.js?v=42"></script>

<!-- Après modification de app.js -->
<script src="js/app.js?v=43"></script>
```

Chercher tous les `?v=` concernés : `grep -n "?v=" frontend/app.html`

---

## Ce qu'on ne fait jamais

- Laisser des `console.log('debug ...')` dans du code commité
- Mettre des clés API ou des URLs de providers en dur dans le code
- Ajouter des `<script src="...">` vers des CDN non approuvés dans `app.html`
- Modifier `models.js` pour la logique — c'est un fichier de données uniquement
- Mélanger la logique serveur et frontend dans le même fichier
