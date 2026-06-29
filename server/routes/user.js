// routes/user.js — Gestion des clés API et préférences user
const express = require('express');
const router  = express.Router();

const sheets = require('../services/sheets');
const { requireAuth } = require('../middleware/auth');
const { encryptApiKeys, decryptApiKeys, encrypt, decrypt } = require('../services/crypto');

// ── GET /api/user/keys ── récupère les clés API déchiffrées ──────
router.get('/keys', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const keys = decryptApiKeys(user.api_keys_enc);
    res.json({ keys });
  } catch (e) {
    console.error('get keys error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT /api/user/keys ── sauvegarde les clés API chiffrées ──────
// Sync multi-appareil : tous les providers + URL/token serveur local
// sont chiffrés et stockés cote serveur. Les clés sont restaurees a
// la connexion sur n'importe quel appareil (PC, mobile, etc.).
router.put('/keys', requireAuth, async (req, res) => {
  try {
    const b = req.body || {};
    // Whitelist explicite : tous les providers IA + local + localToken
    // (URL du serveur LM Studio/Ollama + token Bearer optionnel pour tunnel).
    // String vide = champ effacé, undefined = pas envoyé.
    const keysObj = {
      openai:     b.openai     || '',
      anthropic:  b.anthropic  || '',
      google:     b.google     || '',
      perplexity: b.perplexity || '',
      mistral:    b.mistral    || '',
      grok:       b.grok       || '',
      deepseek:   b.deepseek   || '',
      zai:        b.zai        || '',
      openrouter: b.openrouter || '',
      local:      b.local      || '',
      localToken: b.localToken || '',
    };
    const encrypted = encryptApiKeys(keysObj);
    await sheets.updateUser(req.user.id, { api_keys_enc: encrypted });
    res.json({ ok: true });
  } catch (e) {
    console.error('save keys error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/user/preferences ────────────────────────────────────
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const prefs = user.preferences_enc ? JSON.parse(decrypt(user.preferences_enc)) : {};
    res.json({ preferences: prefs });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT /api/user/preferences ────────────────────────────────────
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const encrypted = encrypt(JSON.stringify(req.body));
    await sheets.updateUser(req.user.id, { preferences_enc: encrypted });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/user/profile ─────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    res.json({
      id: user.id, email: user.email,
      username: user.username, avatar_url: user.avatar_url,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT /api/user/profile ─────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (username) await sheets.updateUser(req.user.id, { username });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// TEMP DEBUG — à supprimer après diag
router.get('/__debug_email_rows', requireAuth, async (req, res) => {
  try {
    const me = await sheets.findById(req.user.id);
    const all = await sheets.getAllRows ? await sheets.getAllRows() : null;
    const matches = (all || []).filter(r => (r[1] || '').toLowerCase() === (me?.email || '').toLowerCase());
    res.json({
      myId: me?.id,
      myEmail: me?.email,
      myFolder: me?.drive_folder_id,
      hasGoogleId: !!me?.google_id,
      matchCount: matches.length,
      matches: matches.map(r => ({
        id: r[0], email: r[1], hasGoogleId: !!r[4], folder: r[6],
        hasPrefs: !!r[8], hasKeys: !!r[7], created: r[9], lastLogin: r[10],
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TEMP DEBUG — vérifie Upstash
router.get('/__debug_upstash', requireAuth, async (req, res) => {
  try {
    const me = await sheets.findById(req.user.id);
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
    const indexKey = `convs-index:${me.drive_folder_id}`;
    let smembersErr = null, filenames = null, sample = null;
    try {
      filenames = await redis.smembers(indexKey);
      if (filenames?.length) sample = filenames.slice(0, 3);
    } catch (e) {
      smembersErr = e.message;
    }
    res.json({
      hasUrl, hasToken,
      urlPrefix: (process.env.UPSTASH_REDIS_REST_URL || '').slice(0, 30),
      tokenLen: (process.env.UPSTASH_REDIS_REST_TOKEN || '').length,
      indexKey,
      filenamesCount: filenames?.length,
      sample,
      smembersErr,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack?.split('\n').slice(0,5) });
  }
});

module.exports = router;
