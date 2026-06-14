// routes/auth.js — Inscription, connexion, Google OAuth
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { google } = require('googleapis');
const router  = express.Router();

const sheets = require('../services/sheets');
const drive  = require('../services/drive');
const { requireAuth } = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 jours
};

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, drive_folder_id: user.drive_folder_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// ── POST /auth/register ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
      return res.status(400).json({ error: 'Champs requis manquants' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Mot de passe trop court (8 caractères min)' });

    const emailLc = email.toLowerCase().trim();
    const existing = await sheets.findByEmail(emailLc);
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hash    = await bcrypt.hash(password, 12);
    const folder  = await drive.createUserFolder(username.replace(/[^a-z0-9_-]/gi, '_'));
    const user    = await sheets.createUser({
      email: emailLc, username: username.trim(),
      password_hash: hash, drive_folder_id: folder,
    });

    const token = makeToken(user);
    res.cookie('goudai_token', token, COOKIE_OPTS);
    res.json({
      ok: true,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Champs requis manquants' });

    const user = await sheets.findByEmail(email.toLowerCase().trim());
    if (!user || !user.password_hash)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    await sheets.updateUser(user.id, { last_login: new Date().toISOString() });
    const token = makeToken(user);
    res.cookie('goudai_token', token, COOKIE_OPTS);
    res.json({
      ok: true,
      user: { id: user.id, email: user.email, username: user.username, avatar_url: user.avatar_url }
    });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /auth/logout ────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('goudai_token');
  res.json({ ok: true });
});

// ── GET /auth/me ─────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({
      id: user.id, email: user.email,
      username: user.username, avatar_url: user.avatar_url
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function resolveRedirectUri(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}/auth/google/callback`;
  return process.env.GOOGLE_REDIRECT_URI;
}

// ── GET /auth/google ─────────────────────────────────────────────
// Redirige vers le consentement Google
router.get('/google', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    resolveRedirectUri(req)
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(url);
});

// ── GET /auth/google/callback ────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=google_denied');

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      resolveRedirectUri(req)
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Récupérer le profil
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const { id: googleId, email, name, picture } = profile;

    // User existant via Google ID ?
    let user = await sheets.findByGoogleId(googleId);

    if (!user) {
      // User existant via email ?
      user = await sheets.findByEmail(email.toLowerCase());
      if (user) {
        // Lier le compte Google à l'existant
        await sheets.updateUser(user.id, { avatar_url: picture, last_login: new Date().toISOString() });
        user = await sheets.findById(user.id);
      } else {
        // Nouveau user
        const safeName = (name || email.split('@')[0]).replace(/[^a-z0-9_-]/gi, '_');
        const folder   = await drive.createUserFolder(safeName);
        user = await sheets.createUser({
          email: email.toLowerCase(), username: name || safeName,
          google_id: googleId, avatar_url: picture, drive_folder_id: folder,
        });
      }
    } else {
      await sheets.updateUser(user.id, { avatar_url: picture, last_login: new Date().toISOString() });
      user = await sheets.findById(user.id);
    }

    const token = makeToken(user);
    res.cookie('goudai_token', token, COOKIE_OPTS);
    res.redirect('/app'); // redirige vers l'app
  } catch (e) {
    console.error('google oauth error:', e);
    res.redirect('/?error=google_failed');
  }
});

module.exports = router;
