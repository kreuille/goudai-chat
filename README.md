# 🧀 GoudAI Chat

Application web de chat multi-IA — interface unique pour 7 providers (OpenAI, Anthropic, Google, Mistral, xAI, DeepSeek, Perplexity).

- **Production** : https://goudai.guedou.com
- **Stack** : Node.js / Express + Vanilla JS — Docker Compose sur VPS Ionos
- **Auth** : Google OAuth2 + JWT (cookie httpOnly `goudai_token`) · **DB users** : Google Sheets · **Stockage** : filesystem local

---

## 🚀 Démarrage rapide (dev local)

```bash
git clone git@github.com:<ton-user>/goudai-chat.git
cd goudai-chat
git checkout dev

cp .env.example .env      # remplir les valeurs (jamais commiter)
cd server && npm install
node index.js             # serveur sur http://localhost:3001
```

Ouvrir http://localhost:3001 dans le navigateur.

---

## 🌿 Workflow Git

```
feature/* ──► dev ──► main ──► (deploy.sh sur VPS)
```

| Branche | Rôle |
|---------|------|
| `main` | Production — VPS tire depuis ici |
| `dev` | Intégration — branche de base de tout développement |
| `feature/*` `fix/*` `chore/*` | Branches éphémères, mergées dans `dev` |

```bash
# Cycle quotidien
git checkout dev && git pull
git checkout -b feature/ma-feature
# ... coder, tester localement ...
git add -p && git commit -m "feat(scope): description"
git checkout dev && git merge feature/ma-feature --no-ff
git push origin dev
```

Voir `.claude/skills/goudai-git/SKILL.md` pour les conventions de commit.

---

## 🚢 Déploiement en production

```bash
# Sur le VPS (ou via SSH)
ssh root@87.106.213.25
cd /root/goudai-chat
./deploy.sh          # git pull main + docker rebuild + restart
```

Le script vérifie la présence du `.env` et du `service-account.json` avant de déployer.
Voir `.claude/skills/goudai-deploy/SKILL.md` pour la procédure complète.

---

## 🏗️ Architecture

```
Internet
   │
   ▼
Nginx Proxy Manager (443 HTTPS / Let's Encrypt)
   │
   ├── /              → frontend/index.html  (login)
   ├── /app           → frontend/app.html    (chat)
   ├── /auth/*  ─────► Node.js :3001
   └── /api/*   ─────► Node.js :3001
                           │
                           ├── Google Sheets  (users + clés API chiffrées)
                           └── filesystem     (conversations JSON — via drive.js)
```

**Note** : les appels aux APIs IA (OpenAI, Anthropic, etc.) se font **directement depuis le navigateur**, pas via le serveur Node.js.

---

## 📁 Structure du projet

```
goudai/
├── .claude/              ← Skills Claude Code (git, deploy, security…)
├── frontend/             ← App web statique (pas de bundler)
│   ├── app.html          ← Page principale (?v= à incrémenter après chaque modif JS/CSS)
│   ├── models.js         ← Définition modèles et tarifs
│   ├── css/style.css     ← Design system KIRO (dark/light)
│   └── js/
│       ├── app.js        ← Logique principale (4111 lignes)
│       ├── api.js        ← Appels APIs IA (streaming direct navigateur → provider)
│       ├── canvas.js     ← Mode canvas / split view
│       └── ...
├── server/               ← API Node.js/Express
│   ├── index.js          ← Point d'entrée (helmet, rate-limit, routes)
│   ├── routes/           ← auth, user, conversations, userdata
│   └── services/         ← sheets, crypto (AES-256-GCM), drive (filesystem local)
├── data/                 ← Runtime VPS uniquement — jamais dans Git
├── deploy.sh             ← Script de déploiement VPS
├── docker-compose.yml
└── .env.example          ← Template variables d'environnement
```

---

## 🔐 Variables d'environnement

Copier `.env.example` → `.env` et remplir :

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | 64 chars hex — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ENCRYPTION_KEY` | 32 bytes hex — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth2 depuis Google Cloud Console |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Chemin vers `service-account.json` |
| `GOOGLE_SHEET_ID` | ID du Google Sheet (base utilisateurs) |
| `CONV_STORAGE_PATH` | Dossier conversations (`/app/data/conversations` en Docker) |
| `FRONTEND_URL` | URL du frontend (pour CORS) — ex: `https://goudai.guedou.com` |

---

## ☁️ Setup Google Cloud (première installation)

### 1. APIs à activer
Console GCP → APIs & Services → Bibliothèque :
- Google Sheets API
- Google People API (profil OAuth)

### 2. Service Account (accès Sheets côté serveur)
IAM & Admin → Comptes de service → Créer → rôle Éditeur → clé JSON → `service-account.json`

Copier l'**email** du service account, puis partager le Google Sheet avec cet email (rôle Éditeur).

### 3. OAuth2 (connexion Google)
APIs & Services → Identifiants → ID client OAuth2 → Application Web  
URI de redirection autorisée : `https://goudai.guedou.com/auth/google/callback`

---

## 🗂️ Structure Google Sheets — Onglet `Users`

11 colonnes (A → K) :

| id | email | username | password_hash | google_id | avatar_url | drive_folder_id | api_keys_enc | preferences_enc | created_at | last_login |
|----|----|----|----|----|----|----|----|----|----|----|

- `drive_folder_id` : identifiant du dossier conversations sur le **filesystem local** (`CONV_STORAGE_PATH/{drive_folder_id}/`)
- `api_keys_enc` : JSON `{openai, anthropic, google, perplexity}` chiffré AES-256-GCM
- `preferences_enc` : JSON `{theme, defaultModels, ...}` chiffré AES-256-GCM

> **Note** : malgré son nom, `drive.js` gère le **filesystem local**, pas Google Drive.

---

## 🛡️ Sécurité

- **Clés API** : chiffrées AES-256-GCM avant stockage Sheets (`server/services/crypto.js`) — format `iv:authTag:ciphertext` (hex)
- **JWT** : cookie httpOnly `goudai_token`, 30 jours, secret 256 bits minimum
- **Rate limiting** : 20 req/15min sur `/auth`, 120 req/min sur `/api`
- **Headers** : helmet.js activé (CSP géré par Nginx)
- **Règle absolue** : `.env` et `service-account.json` ne sont jamais dans Git

Voir `.claude/skills/goudai-security/SKILL.md` pour la checklist complète.

---

## 🩺 Debug rapide

```bash
# Santé du serveur
curl https://goudai.guedou.com/health   # → {"ok":true}

# Logs en temps réel (VPS)
ssh root@87.106.213.25
docker compose -f /root/goudai-chat/docker-compose.yml logs -f goudai
```

Voir `.claude/skills/goudai-debug/SKILL.md` pour le guide de debugging complet.
