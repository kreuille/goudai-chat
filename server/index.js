// index.js — Point d'entrée GoudAI Chat Server
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const { initSheet } = require('./services/sheets');

const app  = express();
app.set('trust proxy', 1); // Derrière NPM (nginx)
const PORT = process.env.PORT || 3001;

// ── Sécurité ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // géré par nginx
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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Trop de requêtes' },
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/auth',              authLimiter, require('./routes/auth'));
app.use('/api/user',          apiLimiter,  require('./routes/user'));
app.use('/api/conversations', apiLimiter,  require('./routes/conversations'));
app.use('/api/userdata',       apiLimiter,  require('./routes/userdata'));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, version: '2.0.0' }));

// ── Servir le frontend (production) ──────────────────────────────
// En production nginx sert le frontend directement ; cette route
// est un fallback pour le dev local.
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));
app.get('/app', (_, res) => res.sendFile(path.join(FRONTEND, 'app.html')));
app.get('/', (_, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Erreurs ───────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ── Démarrage ─────────────────────────────────────────────────────
async function start() {
  try {
    console.log('🔧 Initialisation Google Sheets...');
    await initSheet();
    console.log('✅ Google Sheets OK');
    app.listen(PORT, () => console.log(`🚀 GoudAI Chat Server démarré sur le port ${PORT}`));
  } catch (e) {
    console.error('❌ Démarrage échoué:', e.message);
    process.exit(1);
  }
}

start();
