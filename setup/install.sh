#!/bin/bash
# ================================================================
#  install.sh — Installation GoudAI Chat sur VPS Ionos (Ubuntu 22+)
#  Usage: bash install.sh goudai.tondomaine.fr
# ================================================================
set -e

DOMAIN=${1:-"goudai.tondomaine.fr"}
APP_DIR="/var/www/goudai"
NODE_VERSION="20"

echo "======================================"
echo "  🦊 GoudAI — Installation VPS"
echo "  Domaine : $DOMAIN"
echo "======================================"

# ── 1. Mise à jour système ────────────────────────────────────────
echo ""
echo "▶ 1/8 Mise à jour système..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Node.js ───────────────────────────────────────────────────
echo ""
echo "▶ 2/8 Installation Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
echo "   Node.js $(node --version), npm $(npm --version)"

# ── 3. Nginx ─────────────────────────────────────────────────────
echo ""
echo "▶ 3/8 Installation Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# ── 4. Certbot (Let's Encrypt) ───────────────────────────────────
echo ""
echo "▶ 4/8 Installation Certbot..."
apt-get install -y certbot python3-certbot-nginx

# ── 5. PM2 ───────────────────────────────────────────────────────
echo ""
echo "▶ 5/8 Installation PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 6. Déploiement de l'app ──────────────────────────────────────
echo ""
echo "▶ 6/8 Déploiement des fichiers..."
mkdir -p $APP_DIR
mkdir -p /etc/goudai
mkdir -p /var/log/pm2

# Copier les fichiers (depuis le dossier courant)
cp -r server $APP_DIR/
cp -r frontend $APP_DIR/
cp ecosystem.config.js $APP_DIR/

# Installer les dépendances Node
cd $APP_DIR/server
npm install --production
cd $APP_DIR

# ── 7. Nginx config ──────────────────────────────────────────────
echo ""
echo "▶ 7/8 Configuration Nginx..."
# Remplacer le domaine dans la config
sed "s/goudai\.tondomaine\.fr/$DOMAIN/g" setup/nginx-goudai.conf > /etc/nginx/sites-available/goudai
ln -sf /etc/nginx/sites-available/goudai /etc/nginx/sites-enabled/goudai
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 8. SSL Certbot ───────────────────────────────────────────────
echo ""
echo "▶ 8/8 Certificat SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "⚠️  Certbot échoué — le domaine DNS doit pointer vers ce serveur."
    echo "   Réessaye manuellement : certbot --nginx -d $DOMAIN"
}

# ── Configuration finale ─────────────────────────────────────────
echo ""
echo "========================================"
echo "  ✅ Installation terminée !"
echo "========================================"
echo ""
echo "📋 PROCHAINES ÉTAPES OBLIGATOIRES :"
echo ""
echo "1. Copier le .env :"
echo "   cp $APP_DIR/server/.env.example $APP_DIR/server/.env"
echo "   nano $APP_DIR/server/.env"
echo "   → Remplir : JWT_SECRET, ENCRYPTION_KEY, GOOGLE_*, SHEET_ID, DRIVE_FOLDER_ID"
echo ""
echo "2. Copier le fichier service account Google :"
echo "   cp /chemin/vers/service-account.json /etc/goudai/service-account.json"
echo "   chmod 600 /etc/goudai/service-account.json"
echo ""
echo "3. Démarrer le serveur :"
echo "   cd $APP_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "4. Vérifier : https://$DOMAIN"
echo ""
echo "📊 Commandes utiles :"
echo "   pm2 logs goudai-server    # logs en temps réel"
echo "   pm2 restart goudai-server # redémarrer"
echo "   pm2 status              # état"
