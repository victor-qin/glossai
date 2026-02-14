#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f $ROOT/docker/docker-compose.yml"
ENV_FILE="$ROOT/.env.local"

echo "==> Installing dependencies..."
cd "$ROOT"
npm install

echo "==> Starting dev Convex backend + dashboard..."
$COMPOSE up -d convex-dev dashboard-dev

echo "==> Waiting for convex-dev to be healthy..."
$COMPOSE exec convex-dev sh -c 'until curl -sf http://localhost:3210/version > /dev/null; do sleep 1; done'

echo "==> Generating dev admin key..."
ADMIN_KEY=$($COMPOSE exec -T convex-dev ./generate_admin_key.sh 2>/dev/null | tail -1)

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Creating $ENV_FILE..."
  cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY
EOF
  echo "    Created with admin key."
else
  echo "==> $ENV_FILE already exists — skipping creation."
  echo "    If you need to update the admin key, it is:"
  echo "    $ADMIN_KEY"
fi

echo "==> Pushing schema to dev backend..."
cd "$ROOT"
npx convex dev --once

echo ""
echo "========================================"
echo "  Dev setup complete!"
echo "  Dashboard: http://localhost:6791"
echo ""
echo "  Start these in separate terminals:"
echo "    npx convex dev       # Convex watcher"
echo "    npm run kuroshiro    # Annotation server (:9100), skip if already running"
echo "    npm run dev          # Next.js (:3000)"
echo "========================================"
