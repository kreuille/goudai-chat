// index.js — App Express GoudAI Chat
// Export `app` pour usage dans Vercel serverless (api/index.js wrap autour).
// Si demarre directement via `node server/index.js`, ecoute sur PORT (dev local).
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const { initSheet } = require('./services/sheets');

const app  = express();
app.set('trust proxy', 1); // Vercel proxy (X-Forwarded-For)
const PORT = process.env.PORT || 3001;

// ── Securite ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Parsing ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────
// Vercel serverless : chaque invocation est isolee, donc le rate limiter
// en memoire est moins efficace, mais reste utile contre flood ponctuel.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives, reessayez dans 15 minutes' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Trop de requetes' },
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/auth',              authLimiter, require('./routes/auth'));
app.use('/api/user',          apiLimiter,  require('./routes/user'));
app.use('/api/conversations', apiLimiter,  require('./routes/conversations'));
app.use('/api/userdata',      apiLimiter,  require('./routes/userdata'));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, version: '2.0.0', runtime: process.env.VERCEL ? 'vercel' : 'node' }));

// ── Servir le frontend (dev local uniquement) ─────────────────────
// En production Vercel : les statiques sont servis directement via
// vercel.json rewrites (pas par Express).
if (!process.env.VERCEL) {
  const FRONTEND = path.join(__dirname, '..', 'frontend');
  app.use(express.static(FRONTEND));
  app.get('/app', (_, res) => res.sendFile(path.join(FRONTEND, 'app.html')));
  app.get('/', (_, res) => res.sendFile(path.join(FRONTEND, 'index.html')));
}

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Erreurs ───────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ── Init paresseuse de Google Sheets ──────────────────────────────
// En serverless, initSheet() est appelee a la 1ere requete via un
// guard dans sheets.js (cold start). Pas besoin d'await ici.

// ── Demarrage (uniquement si lance directement, pas via Vercel) ──
if (require.main === module) {
  (async () => {
    try {
      console.log('🔧 Initialisation Google Sheets...');
      await initSheet();
      console.log('✅ Google Sheets OK');
      app.listen(PORT, () => console.log(`🚀 GoudAI Chat Server demarre sur le port ${PORT}`));
    } catch (e) {
      console.error('❌ Demarrage echoue:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = app;
