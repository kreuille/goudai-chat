#!/usr/bin/env bash
# =====================================================================
#  GoudAI Chat — Déploiement sur le VPS
#  Lance depuis /root/goudai-chat sur le VPS :
#     ./deploy.sh           # déploie la branche main
#     ./deploy.sh dev       # déploie une autre branche (debug seulement)
# =====================================================================
set -euo pipefail

BRANCH="${1:-main}"
PROJECT_DIR="/root/goudai-chat"

cd "$PROJECT_DIR"

echo "▶ [$(date '+%H:%M:%S')] Déploiement branche '$BRANCH'…"

# 1. Sécurité : refuser de déployer si .env manquant
if [[ ! -f .env ]]; then
  echo "❌ .env introuvable dans $PROJECT_DIR — abandon." >&2
  exit 1
fi

# 2. Sécurité : refuser de déployer si secrets manquants
if [[ ! -f data/goudai-secrets/service-account.json ]]; then
  echo "❌ data/goudai-secrets/service-account.json introuvable — abandon." >&2
  exit 1
fi

# 3. Récupérer le dernier code
echo "▶ git fetch + checkout + pull"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# 4. Stop containers
echo "▶ docker compose down"
docker compose down

# 5. Rebuild from scratch
echo "▶ docker compose build --no-cache"
docker compose build --no-cache

# 6. Up detached
echo "▶ docker compose up -d"
docker compose up -d

# 7. Petit récap
echo "▶ docker compose ps"
docker compose ps

echo "✅ [$(date '+%H:%M:%S')] Déploiement terminé."
