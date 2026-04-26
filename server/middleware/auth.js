// middleware/auth.js — Vérification JWT
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Token dans httpOnly cookie OU Authorization header (pour flexibilité)
  const token =
    req.cookies?.goudai_token ||
    (req.headers.authorization?.startsWith('Bearer ') &&
     req.headers.authorization.slice(7));

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, username, drive_folder_id }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = { requireAuth };
