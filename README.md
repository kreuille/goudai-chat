# 🦊 GoudAI Chat

Stack : **Node.js / Express + Vanilla JS** — déployé en **Docker Compose** sur VPS Ionos, derrière un reverse-proxy Nginx (NPM) avec Google Sheets (DB) et Google Drive (fichiers utilisateurs).

---

## 🚀 Workflow de développement

### Setup initial (une seule fois)

```bash
git clone git@github.com:<ton-user>/goudai-chat.git
cd goudai-chat
cp .env.example .env       # remplir les valeurs réelles (jamais commit)
```

### Modèle de branches

| Branche | Rôle |
|---------|------|
| `main`  | Production — déclenche le déploiement sur le VPS |
| `dev`   | Intégration — branche de travail courante |
| `feat/*`, `fix/*` | Branches éphémères, mergées dans `dev` via PR |

```
feat/xxx ──► dev ──► main ──► (deploy.sh sur VPS)
```

### Cycle quotidien

```bash
git checkout dev
git pull
git checkout -b feat/ma-feature
# ... code ...
git add . && git commit -m "feat: …"
git push -u origin feat/ma-feature
# Ouvrir une PR vers dev sur GitHub
```

Quand `dev` est stable → PR `dev` → `main` → déploiement.

### Déploiement en production

```bash
ssh goudai-vps
cd /root/goudai-chat
./deploy.sh
```

Le script `deploy.sh` (présent sur le VPS, **pas dans Git**) :
1. `git pull origin main`
2. `docker compose down`
3. `docker compose build --no-cache`
4. `docker compose up -d`

### Données persistantes (jamais dans Git)

- `data/conversations/` → conversations utilisateur (volume Docker, **VPS only**)
- `data/goudai-secrets/service-account.json` → clé GCP (montée en `/etc/goudai:ro`)
- `.env` → secrets runtime

Voir [.gitignore](.gitignore) et [.env.example](.env.example).

---

## ⚙️ Setup historique (PM2 / Nginx, pré-Docker)

> *Conservé à titre de référence. Le déploiement actuel se fait via Docker Compose (voir section ci-dessus).*

## Architecture

```
Internet
   │
   ▼
Nginx (443 HTTPS) ─── /              → frontend/index.html  (login)
   │                  /app           → frontend/app.html    (chat)
   │                  /auth/*  ─────► Node.js :3001
   │                  /api/*   ─────►    │
   │                                     │── Google Sheets  (users DB)
   │                                     └── Google Drive   (JSONs/user)
   ▼
Let's Encrypt SSL
```

---

## Prérequis Google Cloud

### 1. Créer un projet Google Cloud
Aller sur https://console.cloud.google.com → Nouveau projet → "GoudAI Chat"

### 2. Activer les APIs
APIs & Services → Bibliothèque → Activer :
- **Google Sheets API**
- **Google Drive API**
- **Google People API** (pour OAuth profil)

### 3. Service Account (pour Sheets + Drive côté serveur)
1. IAM & Admin → Comptes de service → Créer
2. Nom : `goudai-backend`
3. Rôle : Editor (ou roles personnalisés)
4. Créer une clé JSON → télécharger → renommer `service-account.json`
5. **Copier l'email** du service account (ex: `goudai-backend@monprojet.iam.gserviceaccount.com`)

### 4. Google Sheets (base de données)
1. Aller sur https://sheets.google.com → Nouveau classement
2. Nommer : `GoudAI Chat Users`
3. Renommer l'onglet en `Users`
4. **Partager** avec l'email du service account → rôle **Éditeur**
5. Copier l'**ID du Sheet** dans l'URL : `/spreadsheets/d/**ID**/edit`

### 5. Google Drive (dossier racine des conversations)
1. Aller sur https://drive.google.com → Nouveau dossier
2. Nommer : `GoudAI-Users`
3. **Partager** avec l'email du service account → rôle **Éditeur**
4. Ouvrir le dossier → copier l'**ID dans l'URL** : `/drive/folders/**ID**`

### 6. OAuth2 (connexion "Se connecter avec Google")
1. APIs & Services → Identifiants → Créer des identifiants → ID client OAuth2
2. Type : **Application Web**
3. Nom : `GoudAI Chat Web`
4. Origines autorisées : `https://goudai.tondomaine.fr`
5. URI de redirection : `https://goudai.tondomaine.fr/auth/google/callback`
6. Copier **Client ID** et **Client Secret**

---

## Installation VPS (Ubuntu 22.04+)

### Étape 1 — Uploader les fichiers

```bash
# Depuis ta machine locale
scp -r goudai-full/ root@IP_VPS:/tmp/goudai-install/
```

### Étape 2 — Lancer le script d'installation

```bash
ssh root@IP_VPS
cd /tmp/goudai-install
bash setup/install.sh goudai.tondomaine.fr
```

Le script installe : Node.js 20, Nginx, Certbot, PM2, et déploie l'app.

### Étape 3 — Configurer les variables d'environnement

```bash
cp /var/www/goudai/server/.env.example /var/www/goudai/server/.env
nano /var/www/goudai/server/.env
```

Remplir **toutes** les valeurs :

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://goudai.tondomaine.fr

# Générer avec : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64 caractères hex>

# Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<32 bytes hex>

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://goudai.tondomaine.fr/auth/google/callback

GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/etc/goudai/service-account.json
GOOGLE_SHEET_ID=<ID du Google Sheet>
GOOGLE_DRIVE_ROOT_FOLDER_ID=<ID du dossier Drive>
```

### Étape 4 — Copier le Service Account

```bash
# Uploader depuis ta machine locale
scp service-account.json root@IP_VPS:/etc/goudai/service-account.json

# Sur le VPS
chmod 600 /etc/goudai/service-account.json
chown root:root /etc/goudai/service-account.json
```

### Étape 5 — Démarrer

```bash
cd /var/www/goudai
pm2 start ecosystem.config.js
pm2 save
pm2 logs goudai-server  # Vérifier que ça démarre bien
```

### Étape 6 — Vérifier

```bash
curl https://goudai.tondomaine.fr/health
# Doit retourner: {"ok":true,"version":"1.0.0"}
```

Ouvrir https://goudai.tondomaine.fr → page de connexion GoudAI Chat 🎉

---

## Mise à jour de l'app

```bash
# Uploader les nouveaux fichiers
scp -r frontend/ root@IP_VPS:/var/www/goudai/
scp -r server/ root@IP_VPS:/var/www/goudai/

# Redémarrer sur le VPS
ssh root@IP_VPS "cd /var/www/goudai/server && npm install --production && pm2 restart goudai-server"
```

---

## Structure Google Sheets — Onglet `Users`

| A: id | B: email | C: username | D: password_hash | E: google_id | F: avatar_url | G: drive_folder_id | H: api_keys_enc | I: preferences_enc | J: created_at | K: last_login |
|-------|----------|-------------|------------------|--------------|---------------|-------------------|-----------------|-------------------|--------------|--------------|
| uuid | email | nom | bcrypt hash | google sub | url photo | folder Drive ID | AES-256-GCM | AES-256-GCM | ISO date | ISO date |

- `api_keys_enc` : JSON `{openai,anthropic,google,perplexity}` chiffré AES-256-GCM
- `preferences_enc` : thème, modèle par défaut, etc. — chiffré aussi

---

## Sécurité

- **Mots de passe** : hashés bcrypt (cost 12)
- **JWT** : httpOnly cookie, SameSite=Lax, Secure (HTTPS only), 30j expiry
- **Clés API** : chiffrées AES-256-GCM côté serveur, jamais en clair dans Sheets
- **Rate limiting** : 20 req/15min sur /auth, 120 req/min sur /api
- **HTTPS** : Let's Encrypt, TLS 1.2/1.3 seulement
- **Headers** : Helmet + CSP + HSTS

---

## Commandes utiles

```bash
pm2 logs goudai-server       # Logs en temps réel
pm2 restart goudai-server    # Redémarrer
pm2 stop goudai-server       # Arrêter
nginx -t && nginx -s reload # Recharger Nginx
certbot renew --dry-run    # Tester le renouvellement SSL
```
