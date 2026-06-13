// services/sheets.js — Google Sheets comme base de donnees users
// Migration Vercel : les credentials Google sont lues depuis env var
// GOOGLE_SERVICE_ACCOUNT_JSON_B64 (base64 du JSON service-account)
// au lieu du chemin fichier (le filesystem Vercel est ephemeerique).
// Fallback : GOOGLE_SERVICE_ACCOUNT_KEY_PATH pour dev local.
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

const SHEET_USERS = 'Users';
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Colonnes du sheet Users (ordre = index)
const COL = {
  id:              0,  // A
  email:           1,  // B
  username:        2,  // C
  password_hash:   3,  // D
  google_id:       4,  // E
  avatar_url:      5,  // F
  drive_folder_id: 6,  // G
  api_keys_enc:    7,  // H (JSON chiffre)
  preferences_enc: 8,  // I (JSON chiffre)
  created_at:      9,  // J
  last_login:      10, // K
};
const NUM_COLS = 11;

let _auth = null;
let _sheets = null;
let _initialized = false;

// Lecture des credentials :
//  1. GOOGLE_SERVICE_ACCOUNT_JSON_B64 (Vercel) : base64 du JSON
//  2. GOOGLE_SERVICE_ACCOUNT_JSON     (Vercel) : JSON inline (texte brut)
//  3. GOOGLE_SERVICE_ACCOUNT_KEY_PATH (dev local) : chemin fichier
function loadServiceAccountKey() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    return require(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  }
  throw new Error('Aucune credential Google : definir GOOGLE_SERVICE_ACCOUNT_JSON_B64 (Vercel) ou GOOGLE_SERVICE_ACCOUNT_KEY_PATH (local).');
}

function getAuth() {
  if (_auth) return _auth;
  const key = loadServiceAccountKey();
  _auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  return _auth;
}

function getSheetsClient() {
  if (_sheets) return _sheets;
  _sheets = google.sheets({ version: 'v4', auth: getAuth() });
  return _sheets;
}

// ── Initialise le sheet (cree l'en-tete si absent) ──────────────
// Idempotent + lazy : safe a appeler a chaque cold start serverless.
async function initSheet() {
  if (_initialized) return;
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_USERS}!A1:A1`,
    });
    if (!res.data.values || res.data.values[0][0] !== 'id') {
      const headers = ['id','email','username','password_hash','google_id',
                       'avatar_url','drive_folder_id','api_keys_enc',
                       'preferences_enc','created_at','last_login'];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_USERS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
      console.log('✅ Sheet Users initialise');
    }
    _initialized = true;
  } catch (e) {
    // La feuille n'existe peut-etre pas — on la cree
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_USERS } } }],
      },
    });
    await initSheet();
  }
}

// Wrapper pour s'assurer que initSheet a tourne avant chaque op.
// En serverless, cold start = nouveau process, donc re-init necessaire.
async function ensureReady() {
  if (!_initialized) await initSheet();
}

// ── Lire toutes les lignes ────────────────────────────────────────
async function getAllRows() {
  await ensureReady();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_USERS}!A2:K`,
  });
  return res.data.values || [];
}

function rowToUser(row) {
  if (!row || !row[COL.id]) return null;
  return {
    id:              row[COL.id]              || '',
    email:           row[COL.email]           || '',
    username:        row[COL.username]        || '',
    password_hash:   row[COL.password_hash]   || '',
    google_id:       row[COL.google_id]       || '',
    avatar_url:      row[COL.avatar_url]      || '',
    drive_folder_id: row[COL.drive_folder_id] || '',
    api_keys_enc:    row[COL.api_keys_enc]    || '',
    preferences_enc: row[COL.preferences_enc] || '',
    created_at:      row[COL.created_at]      || '',
    last_login:      row[COL.last_login]      || '',
  };
}

async function findByEmail(email) {
  const rows = await getAllRows();
  const row  = rows.find(r => r[COL.email]?.toLowerCase() === email.toLowerCase());
  return rowToUser(row);
}

async function findByGoogleId(googleId) {
  const rows = await getAllRows();
  const row  = rows.find(r => r[COL.google_id] === String(googleId));
  return rowToUser(row);
}

async function findById(id) {
  const rows = await getAllRows();
  const row  = rows.find(r => r[COL.id] === id);
  return rowToUser(row);
}

async function findRowIndex(id) {
  const rows = await getAllRows();
  const idx  = rows.findIndex(r => r[COL.id] === id);
  return idx === -1 ? -1 : idx + 2;
}

async function createUser({ email, username, password_hash, google_id, avatar_url, drive_folder_id }) {
  await ensureReady();
  const sheets = getSheetsClient();
  const id  = uuidv4();
  const now = new Date().toISOString();
  const row = Array(NUM_COLS).fill('');
  row[COL.id]              = id;
  row[COL.email]           = email || '';
  row[COL.username]        = username || '';
  row[COL.password_hash]   = password_hash || '';
  row[COL.google_id]       = google_id || '';
  row[COL.avatar_url]      = avatar_url || '';
  row[COL.drive_folder_id] = drive_folder_id || '';
  row[COL.created_at]      = now;
  row[COL.last_login]      = now;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_USERS}!A:K`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  return await findById(id);
}

async function updateUser(id, updates) {
  await ensureReady();
  const sheets   = getSheetsClient();
  const rowIndex = await findRowIndex(id);
  if (rowIndex === -1) throw new Error('User not found');
  const user = await findById(id);
  if (!user) throw new Error('User not found');

  const row = [
    user.id, user.email, user.username, user.password_hash,
    user.google_id, user.avatar_url, user.drive_folder_id,
    user.api_keys_enc, user.preferences_enc, user.created_at, user.last_login,
  ];

  if (updates.drive_folder_id !== undefined) row[COL.drive_folder_id] = updates.drive_folder_id;
  if (updates.api_keys_enc    !== undefined) row[COL.api_keys_enc]    = updates.api_keys_enc;
  if (updates.preferences_enc !== undefined) row[COL.preferences_enc] = updates.preferences_enc;
  if (updates.last_login      !== undefined) row[COL.last_login]      = updates.last_login;
  if (updates.avatar_url      !== undefined) row[COL.avatar_url]      = updates.avatar_url;
  if (updates.username        !== undefined) row[COL.username]        = updates.username;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_USERS}!A${rowIndex}:K${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

module.exports = { initSheet, findByEmail, findByGoogleId, findById, createUser, updateUser };
