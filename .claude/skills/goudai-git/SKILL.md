---
name: goudai-git
description: "Workflow Git pour GoudAI Chat. Utilise ce skill pour TOUTE opération Git : créer une branche, faire un commit, merger, résoudre un conflit, préparer une PR, ou décider quelle branche utiliser. Déclenche aussi sur : 'je veux commiter', 'on pousse sur prod', 'crée une branche pour ça', 'comment je merge', 'je veux sauvegarder mes changements'."
---

# Workflow Git — GoudAI Chat

## Philosophie
Le code ne touche jamais directement le VPS de production. Tout passe par Git.
Le VPS tire depuis `main` — `main` est sacrée, tout ce qui y est est déployable immédiatement.

## Structure des branches

```
main          ← Production (VPS tire depuis ici via deploy.sh)
dev           ← Intégration — branche de base pour tout développement
feature/*     ← Nouvelles fonctionnalités (ex: feature/canvas-export-pdf)
fix/*         ← Corrections de bugs (ex: fix/tts-mp3-download)
chore/*       ← Maintenance, deps, config (ex: chore/update-node-deps)
hotfix/*      ← Correctif urgent directement sur main (utiliser avec parcimonie)
```

**Règle d'or** : on ne pousse jamais directement sur `main`. On merge `dev` → `main` quand la feature est testée localement.

## Workflow standard

```bash
# 1. Toujours partir de dev à jour
git checkout dev
git pull origin dev

# 2. Créer la branche de travail
git checkout -b feature/nom-descriptif

# 3. Travailler, puis commiter avec un message conventionnel (voir ci-dessous)
git add -p   # Toujours utiliser -p pour reviewer ce qu'on ajoute
git commit -m "feat(canvas): ajouter export PDF depuis le canvas"

# 4. Pousser la branche
git push origin feature/nom-descriptif

# 5. Merger dans dev quand c'est prêt et testé localement
git checkout dev
git merge feature/nom-descriptif --no-ff
git push origin dev

# 6. Déployer en prod : merger dev → main (voir skill goudai-deploy)
git checkout main
git merge dev --no-ff -m "chore(release): v2.4.0"
git push origin main
```

## Format des commits (Conventional Commits)

```
<type>(<scope>): <description courte>
```

**Types autorisés :**

| Type | Quand l'utiliser |
|------|-----------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Restructuration sans changement de comportement |
| `style` | Formatage, CSS, cosmétique |
| `chore` | Maintenance, build, dépendances |
| `docs` | Documentation uniquement |
| `perf` | Amélioration de performance |
| `security` | Correctif de sécurité |

**Scopes courants pour GoudAI :**
`canvas`, `chat`, `auth`, `tts`, `stt`, `roles`, `models`, `api`, `docker`, `frontend`, `server`, `stats`

**Exemples de bons commits :**
```
feat(models): ajouter support Mistral Large 2 avec tarifs
fix(tts): corriger export MP3 sur Safari iOS
refactor(app): extraire la logique de coût dans costCalculator.js
security(auth): renforcer validation JWT côté serveur
chore(docker): mettre à jour Node.js 20 → 22 dans Dockerfile
```

**Commits à bannir :**
```
fix bug        ← trop vague
wip            ← ne jamais commiter du WIP sur dev/main
update         ← aucune information
modif app.js   ← nom de fichier ≠ description fonctionnelle
```

## .gitignore — fichiers à ne JAMAIS commiter

```
.env
.env.*
!.env.example
/server/data/
/app/data/
service-account.json
*.key
node_modules/
*.log
.DS_Store
```

## Résolution de conflits

1. `git status` — identifier les fichiers en conflit
2. Chercher `<<<<<<<` dans chaque fichier et résoudre manuellement
3. `git add <fichier>` puis `git commit`
4. En cas de doute sur `app.js` ou un fichier critique : ne jamais forcer, demander au développeur

## Bonnes pratiques

- Commits atomiques : un commit = une seule chose logique
- Jamais `git push --force` sur `dev` ou `main`
- `git add -p` plutôt que `git add .` — toujours reviewer ce qu'on ajoute
- Un tag de version sur chaque merge `dev → main` : `git tag v2.x.0`
- Toujours `git pull` avant de commencer à travailler
