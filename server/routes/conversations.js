// routes/conversations.js — CRUD conversations sur Google Drive
const express = require('express');
const router  = express.Router();

const drive  = require('../services/drive');
const sheets = require('../services/sheets');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/conversations — liste les fichiers ─────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const user  = await sheets.findById(req.user.id);
    if (!user?.drive_folder_id)
      return res.status(400).json({ error: 'Dossier Drive non configuré' });

    const files = await drive.listConversations(user.drive_folder_id);
    res.json({ conversations: files });
  } catch (e) {
    console.error('list convs error:', e);
    res.status(500).json({ error: 'Erreur Drive' });
  }
});

// ── GET /api/conversations/:filename — lit un fichier ───────────
router.get('/:filename', requireAuth, async (req, res) => {
  try {
    const user  = await sheets.findById(req.user.id);
    if (!user?.drive_folder_id)
      return res.status(400).json({ error: 'Dossier Drive non configuré' });

    const { google } = require('googleapis');
    const driveClient = require('../services/drive');

    // Trouver le fileId par nom
    const files = await drive.listConversations(user.drive_folder_id);
    const file  = files.find(f => f.name === req.params.filename);
    if (!file) return res.status(404).json({ error: 'Conversation introuvable' });

    const data = await drive.readConversation(file.id);
    res.json(data);
  } catch (e) {
    console.error('read conv error:', e);
    res.status(500).json({ error: 'Erreur Drive' });
  }
});

// ── PUT /api/conversations/:filename — crée ou met à jour ────────
router.put('/:filename', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user?.drive_folder_id)
      return res.status(400).json({ error: 'Dossier Drive non configuré' });

    const filename = req.params.filename;
    if (!filename.endsWith('.json'))
      return res.status(400).json({ error: 'Filename doit se terminer par .json' });

    await drive.writeConversation(user.drive_folder_id, filename, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('write conv error:', e);
    res.status(500).json({ error: 'Erreur Drive' });
  }
});

// ── DELETE /api/conversations/:filename ─────────────────────────
router.delete('/:filename', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user?.drive_folder_id)
      return res.status(400).json({ error: 'Dossier Drive non configuré' });

    const deleted = await drive.deleteConversation(user.drive_folder_id, req.params.filename);
    res.json({ ok: deleted });
  } catch (e) {
    console.error('delete conv error:', e);
    res.status(500).json({ error: 'Erreur Drive' });
  }
});

// ── GET /api/conversations/export/all — export complet ──────────
router.get('/export/all', requireAuth, async (req, res) => {
  try {
    const user = await sheets.findById(req.user.id);
    if (!user?.drive_folder_id)
      return res.status(400).json({ error: 'Dossier Drive non configuré' });

    const allData = await drive.exportAll(user.drive_folder_id);
    res.json({ conversations: allData, user: user.id, exported_at: new Date().toISOString() });
  } catch (e) {
    console.error('export all error:', e);
    res.status(500).json({ error: 'Erreur Drive' });
  }
});

module.exports = router;
