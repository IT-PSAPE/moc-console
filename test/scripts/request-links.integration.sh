#!/usr/bin/env bash
# Runs against a new socket-only local cluster, never an application database.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
links_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-links.XXXXXX")"
cleanup() {
  pg_ctl -D "$links_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$links_dir"
}
trap cleanup EXIT
mkdir "$links_dir/socket"
initdb -D "$links_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$links_dir/data" -o "-h '' -k $links_dir/socket -p 5432" -l "$links_dir/postgres.log" start >/dev/null
links_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$links_dir/socket")"
links_database="postgresql://$(id -un)@localhost/postgres?host=${links_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$links_database" >"$links_dir/bootstrap.log" 2>&1 || { cat "$links_dir/bootstrap.log"; exit 1; }
psql "$links_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/request-links.sql"
# Applying it again also proves the additive migration is safe to retry.
psql "$links_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/request-links.sql"
cd "$root_dir"
MOC_TEST_DATABASE_URL="$links_database" DATABASE_URL="$links_database" npm test -- test/apps/api/server/platform/request-links.integration.test.ts test/apps/api/server/platform/request-links.test.ts test/apps/api/server/platform/equipment-venue-bookings.integration.test.ts
