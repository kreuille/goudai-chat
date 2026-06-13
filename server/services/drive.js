// services/drive.js — Storage des conversations
// Migration Vercel : remplace l'ancien stockage filesystem (CONV_STORAGE_PATH)
// par Upstash Redis (https://upstash.com), accessible via REST API.
//
// Modele de cles Redis :
//   conv:<folderId>:<filename>          -> JSON serialise de la conversation
//   convs-index:<folderId>              -> Set Redis des filenames du user
//   convs-meta:<folderId>:<filename>    -> Hash {modifiedTime, size}
//
// Pourquoi un index Set + meta separes ?
//   Redis n'a pas de "ls", on doit tracker la liste de fichiers d'un user
//   avec un Set. Les metadonnees (date modif, taille) sont dans un Hash
//   pour eviter de charger la conv complete pour le listing.

const { Redis } = require('@upstash/redis');

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('[drive.js] UPSTASH_REDIS_REST_URL/TOKEN manquants — les conversations ne fonctionneront pas en production.');
}

// Client Upstash : utilise UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// (le format `rediss://` direct n'est PAS supporte par @upstash/redis, c'est REST)
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

function safeName(f) { return f.endsWith('.json') ? f : f + '.json'; }
function convKey(folderId, filename)   { return `conv:${folderId}:${safeName(filename)}`; }
function indexKey(folderId)            { return `convs-index:${folderId}`; }
function metaKey(folderId, filename)   { return `convs-meta:${folderId}:${safeName(filename)}`; }

// ── Cree le dossier user (juste un identifiant logique, pas de creation reelle) ──
async function createUserFolder(username) {
  // L'identifiant est utilise comme prefixe de cles Redis.
  // Format identique a l'ancien filesystem pour preserver la compat des donnees migrees.
  return `user_${username}_${Date.now()}`;
}

// ── Liste les conversations d'un user ──
// Retourne [{ id, name, modifiedTime, size }] trie par date modif desc.
async function listConversations(folderId) {
  const filenames = await redis.smembers(indexKey(folderId));
  if (!filenames || filenames.length === 0) return [];

  // Lecture batchee des metadonnees
  const pipeline = redis.pipeline();
  for (const fn of filenames) pipeline.hgetall(metaKey(folderId, fn));
  const metaResults = await pipeline.exec();

  const result = [];
  for (let i = 0; i < filenames.length; i++) {
    const fn = filenames[i];
    const meta = metaResults[i] || {};
    result.push({
      id: convKey(folderId, fn),                  // utilise comme cle de lecture
      name: fn,
      modifiedTime: meta.modifiedTime || new Date(0).toISOString(),
      size: String(meta.size || '0'),
    });
  }
  return result.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
}

// ── Lit une conversation (id = cle Redis complete retournee par listConversations) ──
async function readConversation(fileId) {
  const raw = await redis.get(fileId);
  if (!raw) throw new Error(`Conversation introuvable : ${fileId}`);
  // Upstash REST retourne deja l'objet parse si stocke en JSON. Si c'est une string
  // on parse, sinon on renvoie tel quel.
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

// ── Cree ou met a jour une conversation ──
async function writeConversation(folderId, filename, data) {
  const fn = safeName(filename);
  const key = convKey(folderId, fn);
  const json = JSON.stringify(data);
  const now = new Date().toISOString();
  const size = Buffer.byteLength(json, 'utf8');

  // Pipeline atomique : conv + meta + index
  const pipeline = redis.pipeline();
  pipeline.set(key, json);
  pipeline.hset(metaKey(folderId, fn), { modifiedTime: now, size: String(size) });
  pipeline.sadd(indexKey(folderId), fn);
  await pipeline.exec();

  return key;
}

// ── Supprime une conversation ──
async function deleteConversation(folderId, filename) {
  const fn = safeName(filename);
  const pipeline = redis.pipeline();
  pipeline.del(convKey(folderId, fn));
  pipeline.del(metaKey(folderId, fn));
  pipeline.srem(indexKey(folderId), fn);
  const results = await pipeline.exec();
  // results[0] = nombre de cles supprimees (0 ou 1) pour le DEL conv
  return results[0] > 0;
}

// ── Export complet (lecture batchee de toutes les conv d'un user) ──
async function exportAll(folderId) {
  const filenames = await redis.smembers(indexKey(folderId));
  if (!filenames || filenames.length === 0) return {};

  const pipeline = redis.pipeline();
  for (const fn of filenames) pipeline.get(convKey(folderId, fn));
  const datas = await pipeline.exec();

  const result = {};
  for (let i = 0; i < filenames.length; i++) {
    let val = datas[i];
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { /* keep raw */ }
    }
    if (val !== null && val !== undefined) result[filenames[i]] = val;
  }
  return result;
}

module.exports = {
  createUserFolder,
  listConversations,
  readConversation,
  writeConversation,
  deleteConversation,
  exportAll,
};
