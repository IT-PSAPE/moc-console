#!/usr/bin/env bash
# Exercises notification actor snapshots against an isolated local PostgreSQL.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
attribution_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-attribution.XXXXXX")"
cleanup() {
  pg_ctl -D "$attribution_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$attribution_dir"
}
trap cleanup EXIT
mkdir "$attribution_dir/socket"
initdb -D "$attribution_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$attribution_dir/data" -o "-h '' -k $attribution_dir/socket -p 5432" -l "$attribution_dir/postgres.log" start >/dev/null || { cat "$attribution_dir/postgres.log"; exit 1; }
attribution_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$attribution_dir/socket")"
attribution_database="postgresql://$(id -un)@localhost/postgres?host=${attribution_socket}&port=5432"

"$root_dir/neon/database/build-fresh-database.sh" "$attribution_database" --legacy-import >"$attribution_dir/bootstrap.log" 2>&1 || { cat "$attribution_dir/bootstrap.log"; exit 1; }
psql "$attribution_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-fixture.sql"
# Apply twice to verify the migration is safely repeatable, including when it
# is also installed by a fresh-database bootstrap.
psql "$attribution_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/notification-outbox-attribution.sql"
psql "$attribution_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/notification-outbox-attribution.sql"
psql "$attribution_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/notification-outbox-attribution.sql"
(cd "$root_dir" && MOC_TEST_DATABASE_URL="$attribution_database" DATABASE_URL="$attribution_database" npm test -- test/apps/api/server/notifications/follow-ups.schema.integration.test.ts)
printf 'Notification attribution migration and lifecycle SQL checks passed.\n'
