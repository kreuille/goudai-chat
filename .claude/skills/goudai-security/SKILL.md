---
name: goudai-security
description: "Checklist sécurité pour GoudAI Chat. Utilise ce skill SYSTÉMATIQUEMENT avant tout commit, avant tout déploiement, et lors de l'écriture de code touchant l'authentification, les clés API, le chiffrement, les routes serveur, ou les données utilisateur. Déclenche sur : 'je veux ajouter une route', 'je touche au JWT', 'clé API', 'chiffrement', 'mot de passe', 'avant de commiter', 'avant de déployer', 'est-ce que c'est sécurisé'."
---

# Sécurité — GoudAI Chat

## Surfaces d'attaque critiques
GoudAI Chat gère des clés API de valeur (OpenAI, Anthropic, etc.) et des données de conversation personnelles. Une fuite de clés = des coûts non autorisés potentiellement très élevés pour les utilisateurs.

---

## Ce qui est DÉJÀ en place (ne pas réimplémenter)

Le serveur `server/index.js` inclut déjà :
- **`helmet`** — headers de sécurité HTTP (CSP désactivé, géré par Nginx)
- **`express-rate-limit`** — authLimiter (20 req/15min) + apiLimiter (120 req/min)
- **`trust proxy 1`** — correctement configuré pour Nginx Proxy Manager
- **`CORS`** — restreint à `FRONTEND_URL`

Ne jamais supprimer ou contourner ces middlewares.

---

## Checklist avant chaque commit

```bash
# Commande rapide avant git add
git status                              # Vérifier qu'aucun .env n'apparaît
grep -r "sk-\|sk-ant-\|AIza" . --include="*.js" | grep -v node_modules  # Chercher des clés en dur
git diff --staged                       # Relire tout ce qu'on ajoute
```

- [ ] Aucun fichier `.env` dans `git status`
- [ ] Aucune clé API en dur (`sk-`, `sk-ant-`, `AIza`, etc.)
- [ ] Aucun JWT token en dur
- [ ] `git check-ignore -v .env` confirme que .env est ignoré

---

## Chiffrement des clés API — format réel (crypto.js)

Le format utilisé dans `server/services/crypto.js` est :
```
iv:authTag:ciphertext    (tout en hexadécimal, séparés par ":")
```

```javascript
// Format correct — NE PAS CHANGER ce format sans migration
function encrypt(plaintext) {
  const iv       = crypto.randomBytes(12);   // 12 bytes = 96-bit IV pour GCM
  const cipher   = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag  = cipher.getAuthTag();
  // Stockage : iv:authTag:ciphertext (tout en hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

**Points critiques :**
- `ENCRYPTION_KEY` doit faire exactement 64 caractères hex (= 32 bytes)
- IV toujours aléatoire via `crypto.randomBytes(12)` — jamais réutilisé
- Le format `iv:authTag:data` est ce qui est stocké dans Google Sheets — toute modification casse les données existantes

---

## Authentification JWT — double source

```javascript
// middleware/auth.js — pattern réel (double source)
function requireAuth(req, res, next) {
  // Token dans httpOnly cookie (source principale) OU Authorization header (fallback)
  const token =
    req.cookies?.goudai_token ||
    (req.headers.authorization?.startsWith('Bearer ') &&
     req.headers.authorization.slice(7));

  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, username, drive_folder_id }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
```

- **Source principale** : cookie httpOnly `goudai_token` (défini dans `routes/auth.js`)
- **Fallback** : header `Authorization: Bearer <token>` (pour flexibilité)
- JWT_SECRET doit faire 256 bits minimum
- Durée de vie : 30 jours (configurée dans `routes/auth.js`)
- Le payload JWT ne doit pas contenir de données sensibles (il est décodable côté client)
- Le payload contient : `{ id, email, username, drive_folder_id }` — pas de données sensibles

---

## Clés API utilisateurs — stockage et providers

Les clés API sont stockées à deux endroits :
1. **`localStorage`** côté client — pour les 7 providers (appels directs depuis le navigateur)
2. **Google Sheets chiffré** côté serveur — uniquement pour 4 providers (sync multi-appareils)

**Providers stockés côté serveur** : `openai`, `anthropic`, `google`, `perplexity`
**Providers localStorage uniquement** : `mistral`, `grok`, `deepseek` (appels IA directs seulement)

Route serveur : `PUT /api/user/keys` accepte uniquement `{ openai, anthropic, google, perplexity }`.
Si un utilisateur vide son localStorage, les 4 clés serveur sont récupérées au prochain login. Ne jamais stocker les clés en clair dans le Sheets.

---

## Validation des inputs

```javascript
// Providers acceptés CÔTÉ SERVEUR pour le stockage des clés
const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'google', 'perplexity'];
// (mistral, grok, deepseek = localStorage uniquement)

if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
  return res.status(400).json({ error: 'Provider invalide' });
}
if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 300) {
  return res.status(400).json({ error: 'Clé API invalide' });
}
```

---

## Protection XSS — frontend

```javascript
// Le frontend utilise marked.js pour parser le Markdown des réponses IA
// Toujours utiliser DOMPurify.sanitize() avant d'injecter du HTML
element.innerHTML = DOMPurify.sanitize(marked.parse(content));

// Pour les contenus texte sans Markdown :
element.textContent = userContent;  // jamais innerHTML directement
```

---

## Gestion des secrets — tableau de référence

| Secret | Emplacement | Jamais dans |
|--------|------------|-------------|
| JWT_SECRET | `.env` VPS | Code, Git, logs |
| ENCRYPTION_KEY | `.env` VPS | Code, Git, logs |
| GOOGLE_CLIENT_SECRET | `.env` VPS | Code, Git, frontend |
| service-account.json | `data/goudai-secrets/` VPS | Dossier projet, Git |
| Clés API utilisateurs | Sheets chiffrées | Logs, réponses API |

**Rotation si compromis :**
1. Révoquer la clé chez le provider immédiatement
2. Nouveau secret dans `.env` VPS
3. `./deploy.sh` pour rebuild Docker
4. Si ENCRYPTION_KEY compromise : toutes les clés utilisateurs sont invalides — les utilisateurs doivent re-saisir leurs clés

---

## Audit rapide avant un déploiement majeur

```bash
# Chercher des secrets potentiels
grep -r "sk-\|sk-ant-\|AIza\|Bearer " . --include="*.js" | grep -v node_modules
git ls-files | grep "\.env"          # .env ne doit JAMAIS apparaître
npm audit --prefix server            # Vulnérabilités dans les dépendances
```
