#!/usr/bin/env bash
# One-shot bootstrap for a fresh Ubuntu 24.04 Lightsail instance.
# Idempotent — safe to re-run.
#
# Installs Node 22, pnpm, Postgres 16, Caddy.

set -euo pipefail

if [[ $EUID -eq 0 ]]; then
  echo "Run as the 'ubuntu' user with sudo available, not as root."
  exit 1
fi

echo "==> apt update + base packages"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg lsb-release git ufw

echo "==> Node.js 22 (Nodesource)"
if ! command -v node >/dev/null || ! node --version | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "==> pnpm via corepack"
sudo corepack enable
corepack prepare pnpm@latest --activate

echo "==> Postgres 16"
if ! command -v psql >/dev/null; then
  sudo apt-get install -y postgresql postgresql-contrib
fi
sudo systemctl enable --now postgresql

echo "==> Caddy (official repo)"
if ! command -v caddy >/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi
sudo systemctl enable --now caddy

echo "==> UFW firewall (22 / 80 / 443)"
sudo ufw allow OpenSSH || true
sudo ufw allow 80/tcp  || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable

echo "==> /var/lib/movie-sync for IMDB cache"
sudo mkdir -p /var/lib/movie-sync/imdb-cache
sudo chown -R ubuntu:ubuntu /var/lib/movie-sync

echo
echo "Bootstrap complete."
echo "Next: bash deploy/provision-db.sh, then populate env files, then bash deploy/deploy.sh."
