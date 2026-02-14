#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.production.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Create it with NEXT_PUBLIC_CONVEX_URL, CONVEX_SELF_HOSTED_URL, and CONVEX_SELF_HOSTED_ADMIN_KEY."
  exit 1
fi

echo "==> Pulling latest code..."
cd "$ROOT"
git pull origin main

echo "==> Installing dependencies..."
npm install

echo "==> Deploying Convex schema + functions to prod..."
npx convex deploy --env-file "$ENV_FILE"

echo "==> Building Next.js for production..."
npm run build

echo ""
echo "========================================"
echo "  Prod deploy complete!"
echo ""
echo "  Start/restart these processes:"
echo "    npm run kuroshiro    # Annotation server (:9100)"
echo "    npm run start        # Next.js production (:3000)"
echo "========================================"
