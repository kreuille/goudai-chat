# Skill : goudai-kiro-upgrade

Intégrer les nouveautés d'une nouvelle version de Kiro dans GoudAI sans régression.

## Quand utiliser ce skill

Quand l'utilisateur dit : "nouvelle version de Kiro", "upgrade Kiro", "intègre les
nouveautés de Kiro vX.Y", ou fournit un zip Kiro.

---

## ÉTAPE 0 — Préparation

### 0.1 Placer la nouvelle version

Si l'utilisateur fournit un chemin ou un zip :
```bash
unzip <chemin_zip> -d frontend/kiro_new_reference/
```
Le dossier doit contenir : `js/app.js`, `js/api.js`, `js/filemanager.js`,
`models.js`, `index.html`, `css/style.css`

### 0.2 Vérifier que la référence courante existe

```bash
ls frontend/kiro_v3.1_reference/js/
```
Si absente → arrêter et demander à l'utilisateur.

### 0.3 Identifier les versions

```bash
grep -m1 "version\|v[0-9]" frontend/kiro_new_reference/index.html
grep -m1 "version\|v[0-9]" frontend/kiro_v3.1_reference/index.html
```

---

## ÉTAPE 1 — Analyse du diff (NE PAS TOUCHER AU CODE ICI)

Produire un rapport structuré avant de modifier quoi que ce soit.

### 1.1 Nouveaux providers

```bash
diff <(grep '"editeur"' frontend/kiro_v3.1_reference/models.js | grep -o '"editeur":"[^"]*"' | sort -u) \
     <(grep '"editeur"' frontend/kiro_new_reference/models.js | grep -o '"editeur":"[^"]*"' | sort -u)
```

### 1.2 Nouveaux modèles

```bash
diff frontend/kiro_v3.1_reference/models.js frontend/kiro_new_reference/models.js
```

### 1.3 Nouvelles fonctions dans app.js

```bash
diff <(grep -o "^function [a-zA-Z]*\|^async function [a-zA-Z]*" frontend/kiro_v3.1_reference/js/app.js | sort) \
     <(grep -o "^function [a-zA-Z]*\|^async function [a-zA-Z]*" frontend/kiro_new_reference/js/app.js | sort)
```

### 1.4 Nouvelles sections dans app.js

```bash
diff <(grep "// ---" frontend/kiro_v3.1_reference/js/app.js) \
     <(grep "// ---" frontend/kiro_new_reference/js/app.js)
```

### 1.5 Nouvelles fonctions dans api.js

```bash
diff <(grep -o "^function [a-zA-Z]*\|^async function [a-zA-Z]*" frontend/kiro_v3.1_reference/js/api.js | sort) \
     <(grep -o "^function [a-zA-Z]*\|^async function [a-zA-Z]*" frontend/kiro_new_reference/js/api.js | sort)
```

### 1.6 Nouveaux éléments HTML

```bash
diff <(grep -o 'id="[^"]*"' frontend/kiro_v3.1_reference/index.html | sort) \
     <(grep -o 'id="[^"]*"' frontend/kiro_new_reference/index.html | sort)
```

### 1.7 Nouvelles variables CSS

```bash
diff <(grep "^\s*--" frontend/kiro_v3.1_reference/css/style.css | sort) \
     <(grep "^\s*--" frontend/kiro_new_reference/css/style.css | sort)
```

### 1.8 Rapport de diff

Produire ce tableau AVANT de toucher au code, puis demander confirmation :

| Catégorie | Ajoutés | Modifiés | Supprimés |
|-----------|---------|----------|-----------|
| Providers | ... | ... | ... |
| Modèles text | ... | ... | ... |
| Modèles image/tts/stt | ... | ... | ... |
| Fonctions app.js | ... | ... | ... |
| Fonctions api.js | ... | ... | ... |
| Éléments HTML | ... | ... | ... |
| Variables CSS | ... | ... | ... |

**Attendre la confirmation de l'utilisateur avant l'étape 2.**

---

## ÉTAPE 2 — Classification (quoi porter, quoi ignorer)

### ✅ Porter systématiquement

- Nouveaux providers IA (nouveaux blocs dans PROVIDERS de api.js)
- Nouveaux modèles dans models.js (text, image, tts, stt, search)
- Nouvelles fonctionnalités UI sans dépendance auth
- Nouvelles fonctions utilitaires (formatage, calcul, export)
- Nouvelles variables CSS et améliorations de style
- Corrections de bugs identifiables

### ⚠️ Porter avec adaptation

- `localStorage.setItem('minou-*')` → adapter en `preferences_enc` serveur
  (utiliser le pattern `saveAudioSettingsToServer()` déjà présent dans app.js)
- Nouveaux réglages dans la modale config → ajouter dans app.html ET wirer au serveur
- Nouvelles clés API → vérifier si openai/anthropic/google/perplexity (server-side)
  ou autre provider (localStorage uniquement)
- Tout préfixe `minou-` → remplacer par `goudai-`

### ❌ Ne PAS porter

- Logique d'auth (GoudAI a sa propre auth multi-user JWT)
- Backup/restore vers fichier JSON local (remplacé par stockage serveur)
- Features qui cassent le canvas mode ou le système multi-user

---

## ÉTAPE 3 — Implémentation (une feature à la fois)

### Ordre recommandé (du moins risqué au plus risqué)

1. Nouveaux modèles dans `frontend/models.js` — risque zéro
2. Nouveaux providers dans `frontend/js/api.js`
3. Nouvelles fonctions CSS dans `frontend/css/style.css`
4. Nouvelles fonctions utilitaires dans `frontend/js/app.js`
5. Nouvelles features UI dans `app.html` + `app.js`
6. Nouveaux réglages (avec adaptation serveur)

### Pour chaque feature

```
a) Lire la section dans kiro_new_reference/js/app.js (ou api.js)
b) Lire .claude/skills/goudai-code-standards/SKILL.md
c) Copier/adapter dans le fichier GoudAI cible
d) Remplacer minou- par goudai-
e) Remplacer localStorage budget/prefs par appels serveur
f) Incrémenter ?v= dans app.html
g) Vérifier syntaxe : node --check frontend/js/app.js
```

---

## ÉTAPE 4 — Vérification anti-régression

Après chaque feature :

```bash
node --check frontend/js/app.js && echo "✅ app.js OK"
node --check frontend/js/api.js && echo "✅ api.js OK"

# Fonctions critiques toujours présentes
grep -c "function sendMessage\|function loadConversation\|function resetConversation" frontend/js/app.js
```

Checklist :
- [ ] Envoi d'un message texte (streaming)
- [ ] Chargement d'une conversation existante
- [ ] Canvas mode fonctionnel
- [ ] Nouvelle feature fonctionne avec clé API valide

---

## ÉTAPE 5 — Git

Lire `.claude/skills/goudai-git/SKILL.md` pour les conventions.

```bash
git checkout dev && git pull
git checkout -b feat/kiro-vX.Y-upgrade

# Un commit par catégorie de changement
git add frontend/models.js
git commit -m "feat(models): sync modèles Kiro vX.Y"

git add frontend/js/api.js
git commit -m "feat(api): ajout provider [nom] depuis Kiro vX.Y"

git add frontend/js/app.js frontend/app.html frontend/css/style.css
git commit -m "feat(ui): [feature] depuis Kiro vX.Y"

git checkout dev
git merge feat/kiro-vX.Y-upgrade --no-ff
git push origin dev
```

## ÉTAPE 6 — Mettre à jour la référence

Une fois l'upgrade validé en dev :

```bash
rm -rf frontend/kiro_v3.1_reference
mv frontend/kiro_new_reference frontend/kiro_vX.Y_reference
```

Mettre à jour ce skill : remplacer `kiro_v3.1_reference` par `kiro_vX.Y_reference`
dans toutes les commandes diff de l'étape 1.

---

## Règles absolues

1. **Toujours diffER avant de coder** — produire le rapport étape 1 en premier
2. **Demander confirmation** après le rapport et avant de commencer à coder
3. **Une feature = un commit** — facilite le revert en cas de régression
4. **Jamais toucher à server/** — l'upgrade Kiro est 100% frontend
5. **Toujours incrémenter ?v=** après chaque modification JS/CSS/HTML
