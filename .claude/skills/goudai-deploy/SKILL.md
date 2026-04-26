---
name: goudai-deploy
description: "Pipeline de déploiement pour GoudAI Chat. Utilise ce skill quand : on veut mettre en prod, déployer une feature, pousser sur le VPS, faire un rebuild Docker, vérifier que prod fonctionne après déploiement, ou rollback une version. Déclenche sur : 'on déploie', 'ça marche en local on met en prod', 'rebuild le docker', 'quelque chose est cassé en prod'."
---

# Pipeline de déploiement — GoudAI Chat

## Principe fondamental
**Local → Git → VPS**. On ne modifie jamais de fichiers directement sur le VPS (ni `nano`, ni SCP). Le seul flux autorisé est `git push` + `git pull` sur le serveur.

## Environnements

| Env | Où | Branche | URL |
|-----|-----|---------|-----|
| Dev local | PC Windows | `dev` ou `feature/*` | http://localhost:3001 |
| Production | VPS Ionos 87.106.213.25 | `main` | https://goudai.guedou.com |

## Checklist avant de déployer en production

Avant tout merge `dev → main`, vérifier :

- [ ] L'application démarre en local sans erreur (`npm start` ou `docker compose up`)
- [ ] Les fonctionnalités modifiées fonctionnent manuellement en local
- [ ] Aucun fichier `.env` ou secret n'est inclus dans le commit (`git status` + `git diff --staged`)
- [ ] La version a été incrémentée dans `app.html` (cache navigateur)
- [ ] Le message de commit de merge est clair (`chore(release): v2.x.x`)

## Procédure de déploiement

### Étape 1 — Finaliser sur Git

```bash
# Sur le PC local
git checkout main
git merge dev --no-ff -m "chore(release): v2.4.0"
git tag v2.4.0
git push origin main
git push origin --tags
```

### Étape 2 — Déployer sur le VPS

```bash
# Se connecter au VPS
ssh root@87.106.213.25

# Aller dans le projet et tirer les changements
cd /root/goudai-chat
git pull origin main

# Incrémenter la version JS si pas déjà fait (évite le cache)
# sed -i 's/app\.js?v=[0-9]*/app.js?v=NEW_VERSION/g' frontend/app.html

# Rebuild et redémarrage
docker compose down
docker compose build --no-cache
docker compose up -d

# Vérifier que ça tourne
docker compose logs -f goudai
```

### Étape 3 — Vérifier la prod

Après déploiement, toujours vérifier :
1. Ouvrir https://goudai.guedou.com en navigation privée (cache vide)
2. Se connecter et tester la fonctionnalité déployée
3. Vérifier les logs Docker pendant 1-2 minutes : `docker compose logs -f goudai`
4. Si erreur : voir Rollback ci-dessous

## Script deploy.sh (à placer sur le VPS)

Ce script est la seule commande à exécuter pour déployer :

```bash
#!/bin/bash
set -e  # Stopper au moindre erreur

echo "=== GoudAI Deploy $(date) ==="

cd /root/goudai-chat

echo "→ Git pull..."
git pull origin main

echo "→ Arrêt des containers..."
docker compose down

echo "→ Rebuild..."
docker compose build --no-cache

echo "→ Démarrage..."
docker compose up -d

echo "→ Vérification (attente 5s)..."
sleep 5
docker compose ps

echo "=== Deploy terminé ==="
```

Usage : `bash /root/deploy.sh`

## Rollback d'urgence

Si la prod est cassée après un déploiement :

```bash
# Sur le PC local : revenir au commit précédent sur main
git revert HEAD --no-edit
git push origin main

# Sur le VPS : redéployer
ssh root@87.106.213.25 "bash /root/deploy.sh"
```

Ou plus radical — revenir à un tag précis :
```bash
# Local
git checkout v2.3.0
git checkout -b hotfix/revert-to-2.3
git push origin hotfix/revert-to-2.3

# VPS
git pull && git checkout v2.3.0
docker compose down && docker compose build --no-cache && docker compose up -d
```

## Variables d'environnement

Les `.env` ne sont jamais dans Git. Ils sont gérés séparément :
- **Local** : `.env.local` (jamais commité)
- **VPS** : `/root/goudai-chat/.env` (créé manuellement une seule fois)

Pour ajouter une nouvelle variable :
1. L'ajouter dans `.env.example` (avec une valeur vide ou descriptive)
2. L'ajouter manuellement dans `/root/goudai-chat/.env` sur le VPS
3. Rebuild Docker pour que la variable soit prise en compte

## Points d'attention

- Toujours vérifier le cache navigateur après un déploiement frontend (Ctrl+Shift+R)
- Les erreurs `Grammarly.js` et `message port closed` dans les logs sont des extensions Chrome — ignorer
- Le rebuild `--no-cache` est obligatoire pour les changements frontend (fichiers statiques)
- Ne jamais tuer Docker sans `compose down` propre — risque de corruption des données de conversation
