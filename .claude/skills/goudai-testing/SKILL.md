---
name: goudai-testing
description: "Tests pour GoudAI Chat. Utilise ce skill pour tester une feature avant de déployer, créer une checklist de validation, écrire des tests unitaires pour les services Node.js, ou mettre en place une stratégie de test. Déclenche sur : 'comment je teste ça', 'checklist avant de déployer', 'écrire des tests', 'vérifier que ça marche', 'test de régression', 'jest', 'tests unitaires', 'tests end-to-end'."
---

# Tests — GoudAI Chat

## Contexte actuel
Il n'y a **pas encore de tests automatisés** dans le projet. C'est un risque identifié (dette technique). Ce skill couvre deux niveaux : les tests manuels à faire systématiquement maintenant, et la roadmap pour introduire des tests automatisés progressivement.

---

## Tests manuels — checklist avant tout déploiement

### Fonctionnalités core (toujours tester)
- [ ] Envoyer un message avec au moins 2 providers différents → réponse reçue et affichée
- [ ] Le coût s'affiche en temps réel pendant le streaming
- [ ] Nouvelle conversation → reset propre du chat
- [ ] Charger une conversation existante depuis la sidebar
- [ ] Le titre de conversation se génère automatiquement
- [ ] Le thème dark/light switche correctement

### Selon la feature modifiée
| Si on a modifié... | Tester aussi... |
|--------------------|----------------|
| `api.js` ou un provider | Streaming sur ce provider + un autre |
| `app.js` (sendMessage) | Envoi normal + avec pièce jointe + régénération |
| `canvas.js` | Mode canvas, preview HTML, export |
| `auth.js` ou `routes/auth.js` | Login Google + déconnexion + token expiré |
| `models.js` | Affichage du dropdown, prix corrects |
| CSS / layout | Mobile 375px + desktop + dark/light mode |
| `filemanager.js` | Sauvegarde + chargement + suppression de conv |
| `routes/user.js` | Sauvegarde clés API + rechargement |

### Tests mobile (PWA)
- [ ] Sidebar s'ouvre/ferme en overlay sur mobile
- [ ] Le textarea est accessible quand le clavier virtuel s'ouvre
- [ ] Les boutons sont assez grands pour être tapés (≥ 44px)
- [ ] Pas de scroll horizontal

---

## Tests automatisés — par où commencer

### Priorité 1 : services Node.js critiques

Ces fichiers ont une logique pure, sans dépendance DOM — idéaux pour commencer :

```bash
# Installation Jest dans le projet serveur
cd server
npm install --save-dev jest
```

```javascript
// server/services/crypto.test.js
const { encrypt, decrypt, encryptApiKeys, decryptApiKeys } = require('./crypto');

// Définir une clé de test (64 chars hex = 32 bytes)
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

describe('crypto', () => {
  test('encrypt → decrypt roundtrip', () => {
    const original = 'sk-test-api-key-12345';
    const encrypted = encrypt(original);
    
    expect(encrypted).not.toBe(original);
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // format iv:tag:data
    expect(decrypt(encrypted)).toBe(original);
  });

  test('deux chiffrements de la même valeur donnent des résultats différents (IV aléatoire)', () => {
    const val = 'même valeur';
    expect(encrypt(val)).not.toBe(encrypt(val));
  });

  test('decrypt retourne "" sur une valeur vide', () => {
    expect(decrypt('')).toBe('');
  });

  test('encryptApiKeys → decryptApiKeys roundtrip', () => {
    const keys = { openai: 'sk-123', anthropic: 'sk-ant-456' };
    const enc = encryptApiKeys(keys);
    const dec = decryptApiKeys(enc);
    expect(dec.openai).toBe(keys.openai);
    expect(dec.anthropic).toBe(keys.anthropic);
  });
});
```

```javascript
// server/services/drive.test.js — exemple de test avec mock filesystem
const { saveConversation, getConversation } = require('./drive');
// Mocker fs pour ne pas écrire sur le disque pendant les tests
jest.mock('fs/promises');
// ...
```

### Priorité 2 : middleware auth

```javascript
// server/middleware/auth.test.js
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret';

const { requireAuth } = require('./auth');

describe('requireAuth', () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const mockNext = jest.fn();

  test('rejette si pas de header Authorization', () => {
    requireAuth({ headers: {} }, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('accepte un token valide', () => {
    const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireAuth(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(req.user.id).toBe('user-1');
  });
});
```

### Priorité 3 : tests d'intégration API (Supertest)

```bash
npm install --save-dev supertest
```

```javascript
// server/routes/health.test.js
const request = require('supertest');
const app = require('../index'); // exporter l'app sans .listen()

test('GET /health → 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});
```

---

## Configuration Jest (package.json)

```json
// server/package.json — ajouter
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/*.test.js"],
    "collectCoverageFrom": ["services/**/*.js", "routes/**/*.js", "middleware/**/*.js"]
  }
}
```

---

## Tests frontend — approche pragmatique

Le frontend Vanilla JS sans bundler n'est pas naturellement compatible avec Jest. Options par ordre de complexité :

1. **Court terme** : tests manuels structurés (checklist ci-dessus)
2. **Moyen terme** : extraire la logique pure dans des fonctions testables, tester via Node.js
3. **Long terme** : Playwright pour des tests end-to-end (installe un vrai navigateur)

```bash
# Playwright — tests E2E (à introduire quand les tests unitaires sont en place)
npm install --save-dev @playwright/test
# Permet de scripter : ouvrir l'app, taper un message, vérifier la réponse
```

---

## Intégration CI/CD (futur)

Quand les tests unitaires existent, les connecter à GitHub Actions :

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: cd server && npm ci && npm test
```

Cela bloque les merges si les tests échouent — filet de sécurité automatique.
