# IMDB sync deployment (Lightsail / Ubuntu)

The daily IMDB dataset sync runs as a systemd `oneshot` service triggered by a timer.

## One-time setup on the box

```bash
# 1. Create the persistent cache directory for the IMDB downloads.
sudo mkdir -p /var/lib/movie-sync/imdb-cache
sudo chown ubuntu:ubuntu /var/lib/movie-sync /var/lib/movie-sync/imdb-cache

# 2. Drop the env file (edit DATABASE_URL and OMDB_API_KEY first).
sudo install -m 0640 -o root -g ubuntu \
  deploy/systemd/movie-sync.env.example /etc/movie-sync.env
sudo $EDITOR /etc/movie-sync.env

# 3. Install the unit files.
sudo cp deploy/systemd/movie-imdb-sync.service /etc/systemd/system/
sudo cp deploy/systemd/movie-imdb-sync.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now movie-imdb-sync.timer
```

If your checkout lives somewhere other than `/home/ubuntu/movie`, edit
`WorkingDirectory=` and the `ReadWritePaths=` line in
`movie-imdb-sync.service` accordingly.

## One-time backfill (cast & crew for existing movies)

This pass adds `Person` + `MovieCredit` rows for every movie currently in the
database. It does not call OMDB and does not touch movie fields.

```bash
sudo systemctl start movie-imdb-sync.service     # daily run (discover new)
# or, manually, as the deploy user:
cd /home/ubuntu/movie
DATABASE_URL=... pnpm --filter @movie/backend sync:imdb:backfill
```

The backfill is idempotent — credits for each movie are wiped and re-inserted
in one pass, so running it again later is safe.

## Inspecting the timer

```bash
systemctl list-timers movie-imdb-sync.timer
journalctl -u movie-imdb-sync.service -n 200 --no-pager
```

## Tuning

- `OMDB_MAX_CALLS_PER_RUN` (default 800) — hard ceiling on OMDB hits per run.
  Leave headroom under the free-tier 1000/day budget.
- `IMDB_CACHE_DIR` — where the four `.tsv.gz` files are stored between runs.
  Defaults to `$TMPDIR/imdb-datasets` if unset.
