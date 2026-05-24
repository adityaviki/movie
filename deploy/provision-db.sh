#!/usr/bin/env bash
# Create the postgres role + database for the app.
# Prints the DATABASE_URL to use in your env files.
#
# Re-runnable: skips if role/db already exist.

set -euo pipefail

DB_NAME="${DB_NAME:-movie_manager}"
DB_USER="${DB_USER:-movie}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 24)}"

echo "==> Creating role '$DB_USER' (if missing)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"

echo "==> Creating database '$DB_NAME' (if missing)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

echo "==> Granting schema permissions"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;"

echo
echo "Done. Use this DATABASE_URL in your env files:"
echo
echo "  DATABASE_URL=postgres://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME"
echo
echo "Save the password somewhere — if you re-run with a different password it will NOT update."
