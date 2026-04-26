// routes/userdata.js — Sync serveur pour rôles, prompts enregistrés, catégories
// Stocke un JSON par user dans /app/data/conversations/{userId}/userdata.json

const express = require('express');
const router  = express.Router();
const fs      = require('fs').promises;
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

const CONV_ROOT = process.env.CONV_STORAGE_PATH || '/app/data/conversations';

async function getUserDataPath(userId) {
  const dir = path.join(CONV_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, '__userdata.json');
}

async function readUserData(userId) {
  try {
    const p = await getUserDataPath(userId);
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { roles: {}, prompts: {}, categories: {} };
  }
}

async function writeUserData(userId, data) {
  const p = await getUserDataPath(userId);
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

// ── GET /api/userdata — charger tout au login ─────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await readUserData(req.user.id);
    res.json(data);
  } catch (e) {
    console.error('userdata GET error:', e);
    res.status(500).json({ error: 'Erreur lecture userdata' });
  }
});

// ── PUT /api/userdata — sauvegarder tout ─────────────────────────
router.put('/', requireAuth, async (req, res) => {
  try {
    const existing = await readUserData(req.user.id);
    // Merge : on écrase seulement les clés fournies
    if (req.body.roles     !== undefined) existing.roles      = req.body.roles;
    if (req.body.prompts   !== undefined) existing.prompts    = req.body.prompts;
    if (req.body.categories !== undefined) existing.categories = req.body.categories;
    await writeUserData(req.user.id, existing);
    res.json({ ok: true });
  } catch (e) {
    console.error('userdata PUT error:', e);
    res.status(500).json({ error: 'Erreur sauvegarde userdata' });
  }
});

// ── PATCH /api/userdata/roles — un seul rôle ─────────────────────
router.patch('/roles', requireAuth, async (req, res) => {
  try {
    const { filename, data, deleted } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename requis' });
    const ud = await readUserData(req.user.id);
    if (!ud.roles) ud.roles = {};
    if (deleted) delete ud.roles[filename];
    else ud.roles[filename] = data;
    await writeUserData(req.user.id, ud);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/userdata/prompts — un seul prompt ─────────────────
router.patch('/prompts', requireAuth, async (req, res) => {
  try {
    const { filename, data, deleted } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename requis' });
    const ud = await readUserData(req.user.id);
    if (!ud.prompts) ud.prompts = {};
    if (deleted) delete ud.prompts[filename];
    else ud.prompts[filename] = data;
    await writeUserData(req.user.id, ud);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/userdata/categories — une seule catégorie ─────────
router.patch('/categories', requireAuth, async (req, res) => {
  try {
    const { id, data, deleted } = req.body;
    if (!id) return res.status(400).json({ error: 'id requis' });
    const ud = await readUserData(req.user.id);
    if (!ud.categories) ud.categories = {};
    if (deleted) delete ud.categories[id];
    else ud.categories[id] = data;
    await writeUserData(req.user.id, ud);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
