---
name: goudai-debug
description: "Debugging pour GoudAI Chat. Utilise ce skill quand quelque chose ne fonctionne pas : erreur en console, streaming cassé, page blanche, problème de cache, bug en production, comportement inattendu d'un provider IA, ou quand on ne sait pas où est le problème. Déclenche sur : 'ça ne marche plus', 'erreur dans la console', 'le streaming plante', 'bug en prod', 'page blanche', 'l'API répond pas', 'comment je debug ça', 'les logs montrent quoi'."
---

# Debugging — GoudAI Chat

## Réflexe premier : localiser le problème

Avant de chercher, répondre à ces questions :
1. **Où** : frontend (navigateur) ou backend (serveur Node.js) ?
2. **Quand** : au chargement, à l'envoi d'un message, sur un provider spécifique ?
3. **Reproductible** : toujours ou aléatoire ? Sur tous les navigateurs ?
4. **Récent** : ça marchait avant ? Quel était le dernier changement deployé ?

---

## Debug frontend (navigateur)

### Console DevTools (F12)

```javascript
// Erreurs à surveiller dans la console :
// - "Cannot read properties of null" → getElementById a retourné null
//   → Vérifier que l'ID existe dans app.html
// - "Uncaught ReferenceError: X is not defined"
//   → Ordre de chargement des scripts dans app.html — X doit être chargé avant
// - "Failed to fetch" → Problème réseau ou CORS
// - 401 dans l'onglet Network → JWT expiré ou manquant
```

### Onglet Network

Filtrer par type pour isoler les problèmes :
- **Fetch/XHR** : voir les appels `/api/*` et leur réponse
- **EventStream** : voir le streaming SSE des providers IA
- Clic sur une requête → **Preview** pour voir la réponse JSON

### Problème de cache navigateur
**Symptôme** : modification déployée mais pas visible

```bash
# Solution 1 : forcer le rechargement
Ctrl+Shift+R  (Windows/Linux)
Cmd+Shift+R   (Mac)

# Solution 2 : vider le cache
F12 → Network → cocher "Disable cache" → recharger

# Solution 3 : vérifier que ?v= a été incrémenté
grep -n "?v=" frontend/app.html
```

### Problème de localStorage
```javascript
// Dans la console DevTools :
localStorage.getItem('goudai-apikeys')    // Vérifier les clés API
localStorage.getItem('goudai-theme')      // Vérifier le thème
localStorage.clear()                      // Reset complet (déconnecte)
```

### Streaming cassé (réponse IA tronquée ou vide)
1. Ouvrir DevTools → Network → trouver la requête EventStream
2. Cliquer → onglet **EventStream** : voir les chunks arriver
3. Si la requête n'apparaît pas → erreur avant le fetch (clé API manquante ?)
4. Si 401 → clé API invalide pour ce provider
5. Si 429 → rate limit atteint
6. Si les chunks arrivent mais le texte ne s'affiche pas → bug dans `onChunk` callback dans `app.js`

---

## Debug backend (serveur Node.js)

### Logs Docker en production
```bash
ssh root@87.106.213.25

# Logs en temps réel
docker compose logs -f goudai

# Dernières 100 lignes
docker compose logs --tail=100 goudai

# Filtrer les erreurs
docker compose logs goudai 2>&1 | grep -i "error\|fail\|exception"

# État des containers
docker compose ps
```

### Logs à interpréter
```
✅ "🚀 GoudAI Chat Server démarré sur le port 3001" → démarrage OK
✅ "✅ Google Sheets OK" → connexion Sheets OK
❌ "❌ Démarrage échoué:" → problème au boot (variable manquante ?)
❌ "[auth] JWT verify failed:" → token invalide (normal si expiré)
❌ "decrypt error:" → ENCRYPTION_KEY incorrecte ou donnée corrompue
❌ "GoogleSheets error:" → problème service account ou Sheet ID
```

### Debug en local
```bash
cd server
node index.js
# Les logs apparaissent directement dans le terminal
```

### Vérifier les variables d'environnement
```bash
# Sur le VPS — vérifier que .env est complet
cat /root/goudai-chat/.env | grep -v "=" | head   # Lignes vides ?
# Ne jamais afficher les valeurs en clair dans les logs

# Dans le container
docker exec -it goudai-chat env | grep -v "sk-\|KEY\|SECRET"  # Variables sans valeurs sensibles
```

---

## Problèmes courants et solutions

### "Page blanche" au chargement
1. F12 → console : y a-t-il une erreur JavaScript ?
2. Network : est-ce que `app.html` charge ? Code 200 ?
3. Si 502/503 → le container Docker est down : `docker compose up -d`
4. Si erreur JS `X is not defined` → ordre de chargement des scripts dans `app.html`

### "Clé API invalide" alors qu'elle est correcte
1. Vérifier `localStorage.getItem('goudai-apikeys')` en console
2. Vérifier que la clé est bien pour le bon provider (OpenAI sk- vs Anthropic sk-ant-)
3. Tester la clé directement sur le site du provider
4. Si le problème est après un rebuild Docker : la clé est peut-être en localStorage mais pas re-synchronisée

### Google Sheets inaccessible au démarrage
```bash
# Sur le VPS
ls -la /root/goudai-chat/data/goudai-secrets/service-account.json
# Doit exister et être lisible

# Vérifier la variable
grep "GOOGLE_SERVICE_ACCOUNT" /root/goudai-chat/.env
grep "GOOGLE_SHEET_ID" /root/goudai-chat/.env
```

### Streaming interrompu en cours de génération
- Vérifier la connexion réseau (Wi-Fi instable ?)
- Le frontend a un `AbortController` — vérifier qu'il n'est pas déclenché involontairement
- Certains providers (Google) ont des timeouts plus courts — normal sur de longues réponses

### Erreurs "Grammarly.js" ou "message port closed"
→ **Ignorer** — ce sont des extensions navigateur, pas des bugs de l'app

---

## Health check

```bash
# Vérifier que le serveur répond
curl https://goudai.guedou.com/health
# Doit retourner : {"ok":true,"version":"1.0.0"}

# En local
curl http://localhost:3001/health
```

---

## Outils de debug utiles

```bash
# Sur le VPS — espace disque (conversations peuvent grossir)
df -h
du -sh /root/goudai-chat/data/conversations/

# Nombre de conversations stockées
ls /root/goudai-chat/data/conversations/ | wc -l

# Shell dans le container pour inspecter
docker exec -it goudai-chat sh
ls /app/data/conversations/
```
