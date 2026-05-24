#!/usr/bin/env bash
# Pull latest, install deps, migrate DB, build frontend, restart backend.
# Run on every deploy. Re-runnable.
#
# Avoids `pnpm run <script>` for build/migrate steps because pnpm's
# verify-deps-before-run pre-check exits non-zero on the (harmless)
# ignored-builds warning, which combined with `set -e` aborts the script
# silently. Direct binary calls sidestep the issue.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/movie}"
cd "$REPO_DIR"

echo "==> git pull"
git fetch --quiet
git reset --hard origin/main

echo "==> pnpm install"
# pnpm 11 may exit non-zero on the harmless "ignored build scripts" warning for
# esbuild even with onlyBuiltDependencies set. Tolerate it; the subsequent
# drizzle-kit / vite invocations fail loudly if the install actually broke.
pnpm install --frozen-lockfile || true

echo "==> drizzle migrate"
( cd packages/backend && env $(grep -v '^#' /etc/movie-backend.env | xargs) \
    ./node_modules/.bin/drizzle-kit migrate )

echo "==> build frontend"
( cd packages/frontend && ./node_modules/.bin/vite build )

echo "==> restart backend"
sudo systemctl restart movie-backend.service

echo "==> caddy reload (no-op if Caddyfile unchanged)"
sudo systemctl reload caddy.service || true

echo "==> done. Backend status:"
sudo systemctl --no-pager --lines=10 status movie-backend.service || true
