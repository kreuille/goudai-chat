---
name: goudai-refactor
description: "Refactoring sûr pour GoudAI Chat. Utilise ce skill quand on veut réorganiser du code existant, découper app.js (4111 lignes), extraire un module, améliorer la lisibilité sans changer le comportement, ou nettoyer de la dette technique. Déclenche sur : 'ce fichier est trop gros', 'découper app.js', 'extraire dans un module', 'nettoyer le code', 'refactorer', 'trop de lignes'."
---

# Refactoring sûr — GoudAI Chat

## Principe fondamental
Un refactoring ne change pas le comportement observable. Si quelque chose fonctionne différemment après, c'est un bug, pas un refactoring. La règle d'or : **toujours avoir une app qui fonctionne** avant de commencer, et toujours en avoir une après.

---

## Carte réelle de app.js (4111 lignes)

Sections identifiées par leurs commentaires `// ---` :

| Lignes (approx) | Section | Extractible ? |
|----------------|---------|--------------|
| 1–50 | `fetchLocalModels` + sidebar mobile IIFE | Oui → `sidebar.js` |
| 51–75 | `AUDIO_SETTINGS`, `saveAudioSettings`, `loadBudgetSettings` | Oui → `settings.js` |
| 76–145 | Safe getElementById proxy | Non — patch DOM global |
| 147–235 | Références DOM globales (40+ `getElementById`) | Non — à garder en haut |
| 237–260 | Thème clair/sombre | Oui → `theme.js` |
| 262–445 | Pièces jointes + drag & drop + PDF | Oui → `attachments.js` |
| 446–715 | Export MD/HTML, résumé IA, toggles sidebar | Partiellement |
| 770–840 | Amélioration de prompt (enhance) | Oui → `enhance.js` |
| 841–1082 | Catégories + emoji picker | Oui → `categories.js` |
| 1083–1280 | Sélecteur de modèle custom | Oui → `model-select.js` |
| 1281–1460 | Initialisation, remplissage sélecteurs | Garder dans app.js |
| 1461–1560 | Nouvelle conversation, resetConversation | Garder dans app.js |
| 1562–1950 | saveConversation, titre auto, addMessage (DOM) | `message-renderer.js` |
| 1955–2230 | Bouton régénérer, citations Perplexity | `regenerate.js` |
| 2237–2590 | **sendMessage** (350 lignes) | Garder — cœur du chat |
| 2588–2870 | Liste conversations sidebar, rename, delete, load | Oui → `conv-list.js` |
| 2872–3215 | Rôles (system prompts) : liste, modale, CRUD | Oui → `roles.js` |
| 3068–3215 | Prompts enregistrés + picker | Oui → `prompts.js` |
| 3216–3382 | Micro / dictée vocale (STT) | Oui → `voice.js` |
| 3382–3418 | Dashboard statistiques | Oui → `dashboard.js` |
| 3418–3603 | Modale clés API | Oui → `apikeys-modal.js` |
| 3603–3975 | Budget + graphiques | Oui → `budget.js` |
| 3973–4040 | Copie de code, lightbox images | Oui → `code-blocks.js` |
| 4036–4111 | Canvas helpers (`extractCodeBlocks`, `openCanvas`) | Déjà dans `canvas.js` → supprimer doublons |

---

## Architecture cible

```
frontend/js/
├── app.js              ← Orchestrateur (~300 lignes : init + sendMessage + state)
├── api.js              ← Appels IA (ne pas toucher)
├── auth.js             ← Auth (ne pas toucher)
├── canvas.js           ← Canvas (ne pas toucher)
├── filemanager.js      ← Fichiers serveur (ne pas toucher)
├── models.js           ← Données modèles (ne pas toucher)
└── modules/
    ├── voice.js        ← STT/TTS + micro (lignes 3216–3382)
    ├── categories.js   ← Catégories + emoji picker (841–1082)
    ├── roles.js        ← Rôles/system prompts CRUD (2872–3068)
    ├── prompts.js      ← Prompts enregistrés (3068–3215)
    ├── conv-list.js    ← Liste conversations sidebar (2588–2870)
    ├── dashboard.js    ← Stats + graphiques (3382–3975)
    ├── attachments.js  ← Pièces jointes + drag/drop + PDF (262–445)
    ├── model-select.js ← Sélecteur dropdown custom (1083–1280)
    └── apikeys-modal.js ← Modale config clés API (3418–3603)
```

---

## Procédure de refactoring étape par étape

### 1. Créer une branche dédiée
```bash
git checkout dev
git checkout -b refactor/extract-voice-module
```
Un module = une branche. Ne jamais mélanger plusieurs extractions.

### 2. Copier les fonctions dans le nouveau fichier

```javascript
// frontend/js/modules/voice.js — nouveau fichier
// --- Micro : dictée vocale via Whisper ---

const micIconDefault = document.getElementById('mic-btn')?.innerHTML || '';
const micIconStop    = '<svg ...></svg>';
const micIconLoading = '<svg ...></svg>';

// Toutes les fonctions de la section voice copiées ici...

// Exposer si appelé depuis app.js
window.VoiceModule = { init, startRecording, stopRecording };
```

### 3. Ajouter le `<script>` dans app.html
```html
<!-- Charger AVANT app.js -->
<script src="js/modules/voice.js?v=1"></script>
```

### 4. Dans app.js : remplacer par des appels au module
```javascript
// Avant
micBtn.addEventListener('click', function() { /* 50 lignes */ });

// Après
micBtn.addEventListener('click', function() { VoiceModule.toggle(); });
```

### 5. Tester manuellement
Tester chaque fonctionnalité impactée avant de supprimer l'ancien code.

### 6. Supprimer les fonctions originales de app.js
Seulement après validation complète.

### 7. Commiter
```bash
git add -p
git commit -m "refactor(voice): extraire VoiceModule dans modules/voice.js"
```

---

## Règles d'or

- **Jamais en une seule fois** : extraire un module par PR/branche
- **Chercher toutes les occurrences** avant de renommer :
  ```bash
  grep -n "nomDeLaFonction\|nomDeConstante" frontend/js/app.js
  ```
- **Pas de bundler** : le frontend n'a pas de système de modules ES — tout passe par `window.XXX`
- **Ordre de chargement** dans `app.html` : les modules doivent être chargés avant `app.js`
- **Conserver les commentaires** de section lors du déplacement — ils aident à naviguer

---

## Signaux d'alarme pendant le refactoring

Si on découvre en cours de route :
- Un bug existant caché dans le code → noter dans un commentaire `// TODO: bug` et continuer
- Du code mort (jamais appelé) → noter, ne pas supprimer maintenant
- Une dépendance circulaire inattendue → stopper et analyser avant de continuer

Ces éléments méritent des issues séparées, pas d'être mélangés au refactoring en cours.
