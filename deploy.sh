#!/usr/bin/env bash
# =====================================================================
#  GoudAI Chat — Déploiement sur le VPS
#
#  Le script se base sur SON propre dossier (chaque clone gère sa branche
#  + son container). Permet d'avoir simultanément :
#     /root/goudai-chat       → branche main, container goudai-app    :3001
#     /root/goudai-chat-dev   → branche dev,  container goudai-app-dev:3002
#
#  Usage :
#     ./deploy.sh           # déploie la branche actuellement checkout
#     ./deploy.sh main      # force la branche
#     ./deploy.sh dev       # idem
# =====================================================================
set -euo pipefail

# Le dossier du script (chaque clone a son propre deploy.sh)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Branche cible : argument > branche actuellement checkout > main par défaut
DEFAULT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
BRANCH="${1:-$DEFAULT_BRANCH}"

# Étiquette d'environnement déduite du nom du dossier
ENV_LABEL="prod"
if [[ "$(basename "$PROJECT_DIR")" == *-dev ]]; then
  ENV_LABEL="dev"
fi

echo "▶ [$(date '+%H:%M:%S')] Déploiement [$ENV_LABEL] branche '$BRANCH' (dans $PROJECT_DIR)"

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

echo "✅ [$(date '+%H:%M:%S')] Déploiement [$ENV_LABEL] terminé."
