# Deploying the movie app to Lightsail

Target: a fresh Ubuntu 24.04 Lightsail instance (the one at `13.232.16.216`) serving
`https://movies.adityaviki.com`.

Architecture:
- **Caddy** on :80/:443 → terminates TLS, serves the built frontend, reverse-proxies `/api/*`
- **Fastify backend** on `127.0.0.1:3001` (systemd-managed)
- **Postgres 16** on `127.0.0.1:5432` (systemd-managed)
- **IMDB sync** via systemd timer, daily at 06:00 UTC

---

## 0. DNS

Add an `A` record:

```
movies.adityaviki.com.   A   13.232.16.216
```

Wait for it to resolve (`dig +short movies.adityaviki.com` from anywhere) before
continuing — Caddy will fail to issue a cert otherwise.

## 1. Open ports in Lightsail

Networking tab → IPv4 Firewall → add **HTTP (80)** and **HTTPS (443)**. SSH (22)
is already open.

## 2. SSH onto the box

```bash
ssh ubuntu@13.232.16.216
```

## 3. Clone the repo

```bash
git clone https://github.com/adityaviki/movie.git
cd movie
```

## 4. Run the bootstrap (installs Node, pnpm, Postgres, Caddy)

```bash
bash deploy/bootstrap.sh
```

Idempotent — re-runnable if something fails partway.

## 5. Provision the database

```bash
bash deploy/provision-db.sh
```

It will print a `DATABASE_URL=...` line. **Save the password** — you can't recover
it later.

## 6. Populate env files

```bash
sudo install -m 0640 -o root -g ubuntu \
  deploy/movie-backend.env.example /etc/movie-backend.env
sudo install -m 0640 -o root -g ubuntu \
  deploy/systemd/movie-sync.env.example /etc/movie-sync.env

# Generate fresh secrets:
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"
echo "COOKIE_SECRET=$COOKIE_SECRET"

# Edit both files. Fill in DATABASE_URL (from step 5), JWT_SECRET,
# COOKIE_SECRET, OMDB_API_KEY (also already-set in the example).
sudo $EDITOR /etc/movie-backend.env
sudo $EDITOR /etc/movie-sync.env
```

## 7. Install systemd units and Caddyfile

```bash
sudo cp deploy/systemd/movie-backend.service       /etc/systemd/system/
sudo cp deploy/systemd/movie-imdb-sync.service     /etc/systemd/system/
sudo cp deploy/systemd/movie-imdb-sync.timer       /etc/systemd/system/
sudo cp deploy/Caddyfile                           /etc/caddy/Caddyfile
sudo systemctl daemon-reload
```

## 8. First-time install + build

```bash
# Need to run install/build BEFORE starting the systemd unit so the frontend
# dist/ exists and the backend dependencies are present.
cd /home/ubuntu/movie
pnpm install --frozen-lockfile
pnpm --filter @movie/backend db:migrate
pnpm --filter @movie/frontend build
```

## 9. Seed your admin user

Uncomment the `SEED_USER_*` lines in `/etc/movie-backend.env`, then:

```bash
sudo systemctl set-environment $(cat /etc/movie-backend.env | grep '^SEED_USER_')
cd /home/ubuntu/movie/packages/backend
env $(grep -v '^#' /etc/movie-backend.env | xargs) pnpm db:backfill
```

Comment out (or remove) the `SEED_USER_*` lines afterwards so the credentials
aren't sitting in the env file.

## 10. Start everything

```bash
sudo systemctl enable --now movie-backend.service
sudo systemctl enable --now movie-imdb-sync.timer
sudo systemctl reload caddy
```

Visit `https://movies.adityaviki.com` — Caddy will request a cert from
Let's Encrypt on first request, log in with your seed user, you're live.

## 11. (Optional) Kick off the IMDB cast/crew backfill

```bash
cd /home/ubuntu/movie/packages/backend
env $(grep -v '^#' /etc/movie-sync.env | xargs) pnpm sync:imdb:backfill
```

Takes a few minutes; downloads ~2GB of IMDB datasets to `/var/lib/movie-sync/imdb-cache`.

## Updating after a code push

```bash
cd /home/ubuntu/movie
bash deploy/deploy.sh
```

Pulls latest, installs, migrates, rebuilds frontend, restarts backend.

## Inspecting

```bash
sudo journalctl -u movie-backend.service -f
sudo journalctl -u movie-imdb-sync.service -n 200 --no-pager
sudo systemctl list-timers movie-imdb-sync.timer
sudo journalctl -u caddy -n 100 --no-pager
```

## Files at a glance

```
deploy/
├── README.md                          (this file)
├── bootstrap.sh                       step 4
├── provision-db.sh                    step 5
├── deploy.sh                          for subsequent updates
├── Caddyfile                          step 7
├── movie-backend.env.example          step 6 (→ /etc/movie-backend.env)
└── systemd/
    ├── movie-backend.service          backend daemon
    ├── movie-imdb-sync.service        nightly IMDB+OMDB sync
    ├── movie-imdb-sync.timer          06:00 UTC daily
    ├── movie-sync.env.example         step 6 (→ /etc/movie-sync.env)
    └── README.md                      detailed sync timer docs
```
