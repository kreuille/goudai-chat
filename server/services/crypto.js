// services/crypto.js — Chiffrement AES-256-GCM des clés API
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

/**
 * Chiffre une valeur texte → "iv:authTag:ciphertext" (tout en hex)
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  const iv       = crypto.randomBytes(12);                     // 96-bit IV for GCM
  const cipher   = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag  = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Déchiffre une valeur chiffrée avec encrypt()
 */
function decrypt(ciphertext) {
  if (!ciphertext) return '';
  try {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    const iv       = Buffer.from(ivHex,  'hex');
    const authTag  = Buffer.from(tagHex, 'hex');
    const data     = Buffer.from(dataHex,'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final('utf8');
  } catch (e) {
    console.error('decrypt error:', e.message);
    return '';
  }
}

/**
 * Chiffre un objet {openai, anthropic, google, perplexity} → JSON chiffré
 */
function encryptApiKeys(keysObj) {
  return encrypt(JSON.stringify(keysObj));
}

/**
 * Déchiffre → objet {openai, anthropic, google, perplexity}
 */
function decryptApiKeys(encrypted) {
  try {
    const plain = decrypt(encrypted);
    return plain ? JSON.parse(plain) : {};
  } catch {
    return {};
  }
}

module.exports = { encrypt, decrypt, encryptApiKeys, decryptApiKeys };
