// api/index.js — Catch-all Vercel function qui wrap l'app Express
// Reuse 100% du code Express existant (server/index.js exporte `app`).
// Vercel route TOUTES les requetes /auth/*, /api/*, /health vers ce fichier
// via vercel.json rewrites. L'app Express se charge ensuite du routing.

const app = require('../server/index.js');

module.exports = (req, res) => {
  // Vercel passe directement les objets Node http req/res a Express
  return app(req, res);
};
