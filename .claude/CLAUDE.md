# GoudAI Chat — Guide pour Claude Code

## Présentation du projet
GoudAI Chat est une application web de chat multi-IA développée par Arnaud Guedou.
Elle permet d'interagir avec 7 providers IA (OpenAI, Anthropic, Google, Mistral, xAI, DeepSeek, Perplexity) depuis une interface unique, sans abonnement SaaS.

- **URL production** : https://goudai.guedou.com (branche `main`, container `goudai-app` sur :3001, dossier `/root/goudai-chat/`)
- **URL dev isolée** : https://dev.goudai.guedou.com (branche `dev`, container `goudai-app-dev` sur :3002, dossier `/root/goudai-chat-dev/`)
- **VPS** : 87.106.213.25 (Ubuntu 24.04, Docker) — alias SSH `goudai-vps`
- **Repo GitHub** : branche `main` = prod, `dev` = intégration

> Les deux environnements partagent le même `Dockerfile`, `docker-compose.yml`, OAuth client et clés JWT/encryption — ils sont isolés sur leur `.env`, leur Google Sheet et leurs volumes `data/`. Voir [.env.dev.example](../.env.dev.example) et `README.md` section « Environnement dev isolé ».

## Stack technique
- **Backend** : Node.js / Express.js (`/server/`)
- **Frontend** : Vanilla JS + HTML + CSS (`/frontend/`) — pas de framework, pas de bundler
- **Orchestration** : Docker + Docker Compose
- **Auth** : Google OAuth2 + JWT (cookie httpOnly `goudai_token`, 30 jours)
- **Stockage** : Google Sheets (users) + filesystem local `data/` (conversations)
- **Chiffrement** : AES-256-GCM — format `iv:authTag:ciphertext` (hex)

## Structure du projet
```
goudai/
├── .claude/              ← Skills et config Claude Code (ne pas modifier sans raison)
│   ├── CLAUDE.md         ← Ce fichier
│   └── skills/           ← Skills projet (voir ci-dessous)
├── frontend/             ← Application web (fichiers statiques copiés dans Docker)
│   ├── app.html          ← Page principale — incrémenter ?v= après tout changement JS/CSS
│   ├── index.html        ← Page de connexion
│   ├── models.js         ← Définition modèles et tarifs
│   ├── manifest.json     ← PWA manifest
│   ├── sw.js             ← Service Worker PWA
│   ├── css/
│   │   ├── style.css     ← Styles globaux (design system KIRO Noir Aurique)
│   │   └── canvas.css    ← Styles mode canvas
│   └── js/
│       ├── app.js        ← Logique principale (4111 lignes — refactoring prévu)
│       ├── api.js        ← Appels APIs IA directs navigateur→provider (927 lignes)
│       ├── auth.js       ← Auth côté client (146 lignes)
│       ├── canvas.js     ← Mode canvas / split view (520 lignes)
│       └── filemanager.js ← Gestion fichiers et conversations (307 lignes)
├── server/               ← API Node.js
│   ├── index.js          ← Point d'entrée Express (82 lignes)
│   ├── middleware/
│   │   └── auth.js       ← Middleware JWT requireAuth (cookie OU Bearer header)
│   ├── routes/
│   │   ├── auth.js       ← /auth/google/... (176 lignes)
│   │   ├── conversations.js ← /api/conversations (96 lignes)
│   │   ├── user.js       ← /api/user/keys, /preferences, /profile (88 lignes)
│   │   └── userdata.js   ← /api/userdata — rôles, prompts (108 lignes)
│   ├── services/
│   │   ├── sheets.js     ← Google Sheets — base utilisateurs (189 lignes)
│   │   ├── crypto.js     ← Chiffrement AES-256-GCM (57 lignes)
│   │   └── drive.js      ← Stockage FILESYSTEM LOCAL conversations (70 lignes) ⚠️ pas Google Drive
│   └── package.json
├── data/                 ← JAMAIS commité — données runtime VPS uniquement
│   ├── conversations/    ← Fichiers JSON des conversations
│   └── goudai-secrets/   ← service-account.json Google
├── setup/
│   ├── install.sh        ← Script d'installation VPS
│   └── nginx-kiro.conf   ← Config Nginx Proxy Manager
├── deploy.sh             ← Script de déploiement VPS (git pull + docker rebuild)
├── docker-compose.yml
├── Dockerfile
├── ecosystem.config.js   ← Config PM2 (si utilisé hors Docker)
├── .env                  ← JAMAIS commiter — variables locales ou VPS
├── .env.example          ← Template sans valeurs sensibles
└── .gitignore
```

## Routes API — référence complète

### Auth (`server/routes/auth.js`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/auth/google` | Redirection OAuth2 Google |
| GET | `/auth/google/callback` | Callback OAuth2 → set cookie JWT |
| POST | `/auth/register` | Inscription email/password |
| POST | `/auth/login` | Connexion → set cookie JWT |
| POST | `/auth/logout` | Efface le cookie |

### User (`server/routes/user.js`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/user/keys` | Récupère clés API déchiffrées |
| PUT | `/api/user/keys` | Sauvegarde clés `{openai, anthropic, google, perplexity}` |
| GET | `/api/user/preferences` | Récupère préférences déchiffrées |
| PUT | `/api/user/preferences` | Sauvegarde préférences (theme, modèles...) |
| GET | `/api/user/profile` | Récupère profil `{id, email, username, avatar_url}` |
| PUT | `/api/user/profile` | Met à jour username |

### Conversations (`server/routes/conversations.js`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/conversations` | Liste les conversations |
| GET | `/api/conversations/:filename` | Lit une conversation |
| PUT | `/api/conversations/:filename` | Sauvegarde/crée une conversation |
| DELETE | `/api/conversations/:filename` | Supprime une conversation |
| GET | `/api/conversations/export/all` | Export ZIP de toutes les conversations |

### Userdata (`server/routes/userdata.js`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/userdata` | Récupère rôles + prompts + catégories |
| PUT | `/api/userdata` | Remplace tout le userdata |
| PATCH | `/api/userdata/roles` | Met à jour les rôles |
| PATCH | `/api/userdata/prompts` | Met à jour les prompts |
| PATCH | `/api/userdata/categories` | Met à jour les catégories |

### Système
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | `{"ok":true,"version":"1.0.0"}` |

## Architecture des appels IA

**Les appels aux APIs IA se font directement depuis le navigateur** — le serveur Node.js n'est PAS un proxy IA.

```
app.js (sendMessage) → api.js (streamModel) → Provider API (fetch navigateur direct)
```

Clés API localStorage → utilisées pour les 7 providers  
Clés API serveur → sync uniquement pour `openai`, `anthropic`, `google`, `perplexity`

## Google Sheets — Structure Users (11 colonnes A→K)

| Col | Champ | Description |
|-----|-------|-------------|
| A | `id` | UUID |
| B | `email` | Email |
| C | `username` | Nom affiché |
| D | `password_hash` | bcrypt (vide si Google OAuth) |
| E | `google_id` | ID Google OAuth (vide si email/password) |
| F | `avatar_url` | URL photo |
| G | `drive_folder_id` | Dossier filesystem local conversations |
| H | `api_keys_enc` | `{openai,anthropic,google,perplexity}` chiffré |
| I | `preferences_enc` | `{theme, defaultModels...}` chiffré |
| J | `created_at` | ISO date |
| K | `last_login` | ISO date |

> `drive_folder_id` est un chemin local, **pas** un ID Google Drive.

## Branches Git
- `main` → Production (VPS tire depuis ici via `deploy.sh`)
- `dev` → Intégration (base de tout développement)
- `feature/*`, `fix/*`, `chore/*`, `refactor/*` → Branches de travail

## Skills disponibles
Utiliser ces skills systématiquement — ils contiennent toutes les règles du projet.

### Skills process (comment travailler)
| Skill | Quand l'utiliser |
|-------|-----------------|
| `goudai-git` | Toute opération Git : commit, branch, merge, tag |
| `goudai-deploy` | Avant tout déploiement en production |
| `goudai-code-standards` | Écriture ou modification de code |
| `goudai-security` | Avant tout commit, code auth/clés/chiffrement |
| `goudai-refactor` | Découpage ou réorganisation de code existant |
| `goudai-debug` | Diagnostiquer et résoudre un bug, local ou prod |
| `goudai-testing` | Tester une feature, écrire des tests unitaires |

### Skills rôle (comment penser)
| Skill | Quand l'utiliser |
|-------|-----------------|
| `goudai-dev` | Implémenter une feature, corriger un bug, naviguer le code |
| `goudai-lead-dev` | Décisions d'architecture, revue de code, dette technique |
| `goudai-cto` | Stratégie technique, roadmap, choix infra, risques |
| `goudai-ai` | Intégration providers IA, modèles, streaming, tokens, coûts |
| `goudai-ui` | Composants visuels, CSS, animations, cohérence graphique |
| `goudai-ux` | Parcours utilisateur, friction, onboarding, accessibilité |

## Variables d'environnement requises
Voir `.env.example` pour la liste complète. Variables critiques :
- `JWT_SECRET` — 256 bits minimum
- `ENCRYPTION_KEY` — 64 caractères hex (32 bytes)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` — chemin vers le fichier service-account.json
- `GOOGLE_SHEET_ID`
- `CONV_STORAGE_PATH` — chemin vers `data/conversations/`
- `FRONTEND_URL` — pour CORS (ex: `https://goudai.guedou.com`)

## Règles absolues
1. **Jamais de commit avec `.env` ou des secrets** — vérifier `git status` avant chaque `git add`
2. **Jamais de modification directe sur le VPS** — tout passe par Git
3. **Jamais de push direct sur `main`** — merger depuis `dev`
4. **Toujours incrémenter `?v=` dans `app.html`** après un changement JS ou CSS
5. **Toujours `docker compose build --no-cache`** pour les changements frontend (fichiers statiques)
6. **`data/` reste sur le VPS uniquement** — jamais dans le repo

## Commandes utiles

### Développement local
```bash
cd server
npm install
cp ../.env.example ../.env  # Puis remplir les valeurs
node index.js               # Démarrer le serveur sur :3001
```

### Production (VPS)
```bash
ssh root@87.106.213.25
cd /root/goudai-chat
./deploy.sh           # Déploie main (git pull + docker rebuild)
./deploy.sh dev       # Déploie dev (debug uniquement)
docker compose logs -f goudai  # Suivre les logs
```

### Debug
```bash
docker compose logs -f goudai    # Logs en temps réel
docker compose ps                # État des containers
docker exec -it goudai-chat sh   # Shell dans le container
curl http://localhost:3001/health # Vérifier la santé du serveur
```
