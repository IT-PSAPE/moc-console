#!/usr/bin/env bash
# Runs only on an isolated, socket-only local PostgreSQL cluster.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
overview_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-overview.XXXXXX")"
cleanup() {
  pg_ctl -D "$overview_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$overview_dir"
}
trap cleanup EXIT
mkdir "$overview_dir/socket"
initdb -D "$overview_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$overview_dir/data" -o "-h '' -k $overview_dir/socket -p 5432" -l "$overview_dir/postgres.log" start >/dev/null
overview_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$overview_dir/socket")"
overview_database="postgresql://$(id -un)@localhost/postgres?host=${overview_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$overview_database" --legacy-import >"$overview_dir/bootstrap.log" 2>&1 || { cat "$overview_dir/bootstrap.log"; exit 1; }
psql "$overview_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/overview.sql"
psql "$overview_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/overview.sql"
(cd "$root_dir" && MOC_TEST_DATABASE_URL="$overview_database" DATABASE_URL="$overview_database" npm test -- test/apps/api/server/platform/overview.schema.integration.test.ts)
psql "$overview_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 \
  -f "$root_dir/neon/database/item-discussion.sql" \
  -f "$root_dir/neon/database/scheduled-messages-v2.sql" \
  -f "$root_dir/neon/database/verify-final-state.sql" >"$overview_dir/upgrade.log" 2>&1 || { cat "$overview_dir/upgrade.log"; exit 1; }
(cd "$root_dir" && MOC_TEST_DATABASE_URL="$overview_database" DATABASE_URL="$overview_database" npm test -- test/apps/api/server/platform/overview.schema.integration.test.ts)
printf 'Overview migration idempotence, role policies, daily rotation and preferences passed.\n'
