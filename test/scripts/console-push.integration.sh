#!/usr/bin/env bash
# Rehearses against a new socket-only local cluster, never an app database.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
push_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-push.XXXXXX")"
cleanup() {
  pg_ctl -D "$push_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$push_dir"
}
trap cleanup EXIT
mkdir "$push_dir/socket"
initdb -D "$push_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$push_dir/data" -o "-h '' -k $push_dir/socket -p 5432" -l "$push_dir/postgres.log" start >/dev/null
push_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$push_dir/socket")"
push_database="postgresql://$(id -un)@localhost/postgres?host=${push_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$push_database" --legacy-import >"$push_dir/bootstrap.log" 2>&1 || { cat "$push_dir/bootstrap.log"; exit 1; }
psql "$push_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-fixture.sql"
psql "$push_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/console-push.sql"
psql "$push_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/console-push.sql"
psql "$push_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-console-push.sql" -f "$root_dir/test/neon/sql/console-push.sql"
cd "$root_dir"
MOC_TEST_DATABASE_URL="$push_database" DATABASE_URL="$push_database" npm test -- test/apps/api/server/platform/push.integration.test.ts
printf 'Console push migration and authorization checks passed.\n'
