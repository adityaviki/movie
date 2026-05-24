#!/usr/bin/env bash
# Pull latest, install deps, build frontend, migrate DB, restart backend.
# Run on every deploy. Re-runnable.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/movie}"
cd "$REPO_DIR"

echo "==> git pull"
git fetch --quiet
git reset --hard origin/main

echo "==> pnpm install"
pnpm install --frozen-lockfile

echo "==> drizzle migrate"
pnpm --filter @movie/backend db:migrate

echo "==> build frontend"
pnpm --filter @movie/frontend build

echo "==> restart backend"
sudo systemctl restart movie-backend.service

echo "==> caddy reload (no-op if Caddyfile unchanged)"
sudo systemctl reload caddy.service || true

echo "==> done. Backend status:"
sudo systemctl --no-pager --lines=10 status movie-backend.service || true
