#!/usr/bin/env bash
# Rehearses the legacy cutover on an isolated, socket-only local PostgreSQL.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
v2_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-scheduled-v2.XXXXXX")"
cleanup() {
  pg_ctl -D "$v2_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$v2_dir"
}
trap cleanup EXIT
mkdir "$v2_dir/socket"
initdb -D "$v2_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$v2_dir/data" -o "-h '' -k $v2_dir/socket -p 5432" -l "$v2_dir/postgres.log" start >/dev/null
v2_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$v2_dir/socket")"
v2_database="postgresql://$(id -un)@localhost/postgres?host=${v2_socket}&port=5432"

"$root_dir/neon/database/build-fresh-database.sh" "$v2_database" --legacy-import >"$v2_dir/bootstrap.log" 2>&1 || { cat "$v2_dir/bootstrap.log"; exit 1; }
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-fixture.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-v2-legacy.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-legacy.sql"
psql "$v2_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/item-discussion.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-item-discussion.sql"
activity_before="$(psql "$v2_database" --quiet --no-psqlrc --tuples-only --no-align -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM public.item_activity')"
psql "$v2_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/scheduled-messages-v2.sql"
psql "$v2_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/scheduled-messages-v2.sql"
activity_after="$(psql "$v2_database" --quiet --no-psqlrc --tuples-only --no-align -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM public.item_activity')"
if [ "$activity_before" != "$activity_after" ]; then
  echo 'Scheduled-message migration emitted synthetic item activity.' >&2
  exit 1
fi
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-v2.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-v2-app.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-item-discussion.sql"
psql "$v2_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-final-state.sql"
psql "$v2_database" --quiet --no-psqlrc --tuples-only --no-align -v ON_ERROR_STOP=1 -f "$root_dir/test/scripts/scheduled-v2-render-bridge.sql" >"$v2_dir/render-bridge.json"
(cd "$root_dir" && npm run build --workspace=@moc/notifications && node test/scripts/scheduled-v2-render-bridge.ts "$v2_dir/render-bridge.json")
(cd "$root_dir" && MOC_TEST_DATABASE_URL="$v2_database" DATABASE_URL="$v2_database" npm test -- test/apps/api/server/scheduled-messages/schema.integration.test.ts)

createdb --host="$v2_dir/socket" --port=5432 scheduled_v2_fresh
fresh_database="postgresql://$(id -un)@localhost/scheduled_v2_fresh?host=${v2_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$fresh_database" >"$v2_dir/fresh-bootstrap.log" 2>&1 || { cat "$v2_dir/fresh-bootstrap.log"; exit 1; }
printf 'Scheduled-message v2 migration and lifecycle SQL checks passed.\n'
