# Plan Migration GoudAI Chat : 136,33€ → 0€

## 🎯 Objectif
Migrer GoudAI Chat de GCP vers Vercel + Upstash (free tier).

**Coûts actuels** : 136,33€/mois (GCP Cloud Run + Firebase Hosting)  
**Coûts après migration** : 0€/mois

---

## 📊 Architecture actuelle vs nouvelle

### Avant (GCP - 136,33€)
```
[GCP Cloud Run]
├── Node.js/Express backend
├── Firebase Hosting (frontend)
├── Cloud SQL ou Filesystem storage
└── Cloud SSL (Google managed)
```

### Après (Vercel + Upstash - 0€)
```
[Vercel Edge Functions]
├── Node.js API routes (backend)
├── Frontend SPA (static)
├── Upstash Redis (session storage)
└── Free SSL (Let's Encrypt)
```

---

## 🚀 Étapes de migration (ordre)

### Phase 1 : Créer les services gratuits (20 min)

1. **Upstash Redis** (upstash.com)
   - Créer compte
   - Créer Redis DB EU (Frankfurt)
   - Copier `UPSTASH_REDIS_URL` (format : `rediss://default:pwd@host:port`)
   - Note: Free tier = 10k commands/day (suffisant pour chat app)

2. **Vercel** (vercel.com)
   - Connecter GitHub repo `goudai-chat`
   - Créer project
   - Région: Frankfurt (EU)

---

### Phase 2 : Adapter le code (2-3 heures)

#### Backend (Node.js/Express)

**Fichier** : `server/package.json`
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "redis": "^4.6.0",
    "ioredis": "^5.3.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  }
}
```

**Fichier** : `server/index.js` ou `server/server.js` (adapter)

Remplacer :
```javascript
// ❌ Avant (filesystem)
const fs = require('fs');
const users = JSON.parse(fs.readFileSync('data/users.json'));
const sessions = JSON.parse(fs.readFileSync('data/sessions.json'));
```

Par :
```javascript
// ✅ Après (Upstash Redis)
const Redis = require('ioredis');
const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// Get users
const users = JSON.parse(await redis.get('users')) || [];

// Set users
await redis.set('users', JSON.stringify(users));

// Sessions with TTL (24h)
await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
```

**Fichier** : `api/chat.js` (créer endpoint Vercel)
```javascript
// Vercel Edge Function (api/chat.js)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
});

export default async function handler(req, res) {
  const { message, sessionId } = req.body;
  
  // Get session from Redis
  const session = await redis.get(`session:${sessionId}`);
  
  // Call LLM providers (OpenAI, Claude, Google, etc.)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ messages: session.messages, model: 'gpt-3.5-turbo' })
  });
  
  // Save session
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
  
  return res.json(response.data);
}
```

#### Frontend (Vanilla JS)

**Fichier** : `.env.local`
```
NEXT_PUBLIC_API_URL=https://goudai.vercel.app
```

**Aucun changement** : Frontend reste Vanilla JS, juste refactoriser pour appeler `/api/*` routes Vercel

---

### Phase 3 : Convertir à Vercel (1-2 heures)

#### 3.1 Structure Vercel
```
goudai-chat/
├── api/
│   ├── chat.js          (POST /api/chat)
│   ├── auth.js          (POST /api/auth)
│   └── session.js       (GET /api/session/:id)
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.local
├── vercel.json
└── package.json
```

#### 3.2 vercel.json (créer)
```json
{
  "buildCommand": "npm install",
  "outputDirectory": "public",
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "env": {
    "UPSTASH_REDIS_URL": "@upstash_redis_url",
    "OPENAI_API_KEY": "@openai_api_key",
    "GOOGLE_API_KEY": "@google_api_key"
  }
}
```

#### 3.3 package.json (adapter)
```json
{
  "scripts": {
    "dev": "vercel dev",
    "build": "vercel build",
    "start": "vercel start"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@upstash/redis": "^1.25.0",
    "cors": "^2.8.5"
  }
}
```

---

### Phase 4 : Deploy sur Vercel (30 min)

1. **Push vers GitHub**
   ```bash
   git add .
   git commit -m "refactor: migrate to Vercel + Upstash"
   git push origin main
   ```

2. **Vercel Deploy**
   - Connecter repo GitHub
   - Vercel détecte automatiquement
   - Ajouter env vars :
     - `UPSTASH_REDIS_URL` = valeur copiée
     - `OPENAI_API_KEY` = clé OpenAI
     - `GOOGLE_API_KEY` = clé Google (si utilisé)
     - Autres provider keys

3. **Test**
   ```bash
   curl https://goudai.vercel.app
   curl -X POST https://goudai.vercel.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "sessionId": "test"}'
   ```

---

### Phase 5 : OAuth2 Google (si utilisé) (20 min)

**Vérifier** : Redirect URIs dans Google Cloud Console
```
Avant: https://goudai.guedou.com/auth/callback
Après: https://goudai.vercel.app/auth/callback
```

1. Google Cloud Console → OAuth consent screen
2. Ajouter redirect URI : `https://goudai.vercel.app/auth/callback`
3. Copier nouvelle clé dans Vercel env vars

---

### Phase 6 : DNS (optionnel) (30 min)

Si vous voulez garder `goudai.guedou.com` :

1. **Vercel Domains**
   ```
   Ajouter domaine custom: goudai.guedou.com
   Vercel fournit CNAME
   ```

2. **DNS Provider**
   ```
   CNAME goudai.guedou.com → cname.vercel-dns.com.
   ```

3. **Vercel SSL**
   - Auto-généré par Let's Encrypt (gratuit)

---

### Phase 5 : Cleanup GCP (15 min) - APRÈS validation complète

```bash
# GCP Console → Cloud Run → Services
# 1. Supprimer service Cloud Run (goudai)
gcloud run services delete goudai \
  --region=europe-west1 \
  --project=YOUR_GCP_PROJECT \
  --quiet

# 2. Supprimer Firebase Hosting
# GCP Console → Firebase → Hosting → Supprimer site

# 3. Supprimer images Artifact Registry (si utilisé)
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/YOUR_PROJECT/goudai

# 4. (Optionnel) Supprimer domaine custom
# GCP Console → Cloud Run → Domaines et routage → Supprimer goudai.guedou.com
```

---

## 📊 Coûts détaillés (après migration)

| Service | Coût | Notes |
|---------|------|-------|
| Vercel | 0€ | Free tier (Hobby) |
| Upstash Redis | 0€ | Free tier (10k cmds/day) |
| OpenAI/Claude/Google API | 0-5€/mois | Usage-based (set budget limits) |
| Google Sheets (users DB) | 0€ | Gratuit |
| **TOTAL** | **0€** | |

**Économies** : 136,33€/mois ✅

---

## ⚠️ Limitations free tier

| Service | Limite | Impact |
|---------|--------|--------|
| Vercel | Unlimited bandwidth | ✅ Aucun impact |
| Vercel | 6000 build minutes/month | ✅ OK pour petit projet |
| Upstash | 10k commands/day | ✅ ~100-500 utilisateurs actifs |
| Upstash | Max 10KB value size | ⚠️ Sessions > 10KB → split |
| Vercel Functions | 10s timeout | ⚠️ Requests > 10s timeout |

---

## ✅ Checklist

- [ ] Upstash Redis créé + URL copiée
- [ ] GitHub repo refactorisé (api/ routes)
- [ ] Code adapté (Redis au lieu filesystem)
- [ ] vercel.json créé
- [ ] Env vars configurées dans Vercel
- [ ] Build réussi (`vercel build`)
- [ ] Tests E2E passent
- [ ] OAuth Google redirect URIs mises à jour
- [ ] DNS custom configuré (optionnel)
- [ ] VPS Ionos supprimé

**Temps total** : 1 jour de travail  
**Économies** : 136,33€/mois ✅

---

## 🆘 Troubleshooting

**Upstash connection refused** :
- Vérifier URL format : `rediss://` (avec 's')
- Vérifier env var dans Vercel settings

**OAuth redirect mismatch** :
- Vérifier Google Cloud Console a le bon redirect URI
- Vérifier NEXT_PUBLIC_API_URL correct

**Vercel function 502** :
- Check logs : Vercel Dashboard → Deployments → Logs
- Possible : Upstash timeout ou API provider down

**Sessions stockées en Upstash** :
- Redis TTL 24h (ajustable)
- Pas de données persistantes (sessions perdues au redeploy)
- **Solution** : Garder DB persistente ailleurs (Neon PostgreSQL ~5€, ou gratuit 0.5GB Neon)

---

## Alternatives si besoin

**Si Upstash Redis pas assez** :
- **Neon PostgreSQL** (0.5GB free) pour sessions persistentes
- **Turso SQLite** (free tier) pour sessions

**Si Vercel functions 10s timeout pas assez** :
- **Render.com** (free tier, auto-sleep acceptable)
