#!/usr/bin/env bash
# Uses a new socket-only local cluster; never touches an application database.
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
discussion_dir="$(mktemp -d "${TMPDIR:-/tmp}/moc-discussion.XXXXXX")"
cleanup() {
  pg_ctl -D "$discussion_dir/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$discussion_dir"
}
trap cleanup EXIT
mkdir "$discussion_dir/socket"
initdb -D "$discussion_dir/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$discussion_dir/data" -o "-h '' -k $discussion_dir/socket -p 5432" -l "$discussion_dir/postgres.log" start >/dev/null
discussion_socket="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=""))' "$discussion_dir/socket")"
discussion_database="postgresql://$(id -un)@localhost/postgres?host=${discussion_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$discussion_database" --legacy-import >"$discussion_dir/bootstrap.log" 2>&1 || { cat "$discussion_dir/bootstrap.log"; exit 1; }
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/scheduled-fixture.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-legacy.sql"
psql "$discussion_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/item-discussion.sql"
psql "$discussion_database" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/item-discussion.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-domains.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-identity.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-scheduled.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/test/neon/sql/item-discussion-public.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-item-discussion.sql"
psql "$discussion_database" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$root_dir/neon/database/verify-final-state.sql"
cd "$root_dir"
MOC_TEST_DATABASE_URL="$discussion_database" DATABASE_URL="$discussion_database" npm test -- test/neon/database.test.ts test/apps/api/server/platform/discussion.integration.test.ts test/apps/api/server/platform/equipment-venue-bookings.integration.test.ts test/apps/api/server/platform/request-links.integration.test.ts
createdb --host="$discussion_dir/socket" --port=5432 discussion_fresh
discussion_fresh_database="postgresql://$(id -un)@localhost/discussion_fresh?host=${discussion_socket}&port=5432"
"$root_dir/neon/database/build-fresh-database.sh" "$discussion_fresh_database" >"$discussion_dir/fresh-bootstrap.log" 2>&1 || { cat "$discussion_dir/fresh-bootstrap.log"; exit 1; }
printf 'Item discussion migration and authorization checks passed.\n'
