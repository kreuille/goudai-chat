// services/drive.js — Stockage LOCAL (filesystem VPS)
const fs   = require('fs').promises;
const path = require('path');

const CONV_ROOT = process.env.CONV_STORAGE_PATH || '/app/data/conversations';

async function getUserDir(folderId) {
  const dir = path.join(CONV_ROOT, String(folderId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function safeName(f) { return f.endsWith('.json') ? f : f + '.json'; }

async function createUserFolder(username) {
  const folderId = `user_${username}_${Date.now()}`;
  await getUserDir(folderId);
  return folderId;
}

async function listConversations(folderId) {
  const dir = await getUserDir(folderId);
  const files = await fs.readdir(dir);
  const result = [];
  for (const f of files.filter(f => f.endsWith('.json'))) {
    const stat = await fs.stat(path.join(dir, f));
    // id = chemin COMPLET pour que readConversation(file.id) fonctionne
    result.push({
      id: path.join(dir, f),
      name: f,
      modifiedTime: stat.mtime.toISOString(),
      size: String(stat.size)
    });
  }
  return result.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
}

async function readConversation(fileId) {
  // fileId = chemin complet retourné par listConversations
  const raw = await fs.readFile(fileId, 'utf8');
  return JSON.parse(raw);
}

async function writeConversation(folderId, filename, data) {
  const dir  = await getUserDir(folderId);
  const file = path.join(dir, safeName(filename));
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

async function deleteConversation(folderId, filename) {
  const dir  = await getUserDir(folderId);
  const file = path.join(dir, safeName(filename));
  try { await fs.unlink(file); return true; } catch { return false; }
}

async function exportAll(folderId) {
  const dir   = await getUserDir(folderId);
  const files = await fs.readdir(dir);
  const result = {};
  for (const f of files.filter(f => f.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(dir, f), 'utf8');
      result[f] = JSON.parse(raw);
    } catch (e) { console.error(`Export error ${f}:`, e.message); }
  }
  return result;
}

module.exports = { createUserFolder, listConversations, readConversation, writeConversation, deleteConversation, exportAll };
