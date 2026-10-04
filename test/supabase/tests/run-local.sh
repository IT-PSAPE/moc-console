#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: test/supabase/tests/run-local.sh <migration.sql> [migration.sql ...]" >&2
  exit 2
fi

for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "SQL file not found: $file" >&2
    exit 2
  fi
done

TEST_ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRATCH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/moc-scheduled-messages.XXXXXX")"
SOCKET_DIR="$SCRATCH_DIR/socket"
mkdir "$SOCKET_DIR"

cleanup() {
  pg_ctl -D "$SCRATCH_DIR/data" stop -m immediate >/dev/null 2>&1 || true
  python3 -c 'import pathlib, shutil, sys; shutil.rmtree(pathlib.Path(sys.argv[1]), ignore_errors=True)' "$SCRATCH_DIR"
}
trap cleanup EXIT

initdb -D "$SCRATCH_DIR/data" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$SCRATCH_DIR/data" -o "-h '' -k $SOCKET_DIR -p 5432" -l "$SCRATCH_DIR/postgres.log" start >/dev/null

run_sql() {
  psql -h "$SOCKET_DIR" -p 5432 -U "$(id -un)" -d postgres \
    --no-psqlrc -v ON_ERROR_STOP=1 -f "$1"
}

run_sql "$TEST_ROOT/fixture.sql"
run_sql "$TEST_ROOT/seed.sql"
for file in "$@"; do
  echo "→ $(basename "$file")"
  if [[ "$(basename "$file")" == *-remove-expected-arrival.sql ]]; then
    run_sql "$TEST_ROOT/remove-expected-arrival-before.sql"
  fi
  run_sql "$file"
  if [[ "$(basename "$file")" == *-remove-expected-arrival.sql ]]; then
    run_sql "$TEST_ROOT/remove-expected-arrival-after.sql"
  fi
done
run_sql "$TEST_ROOT/assertions.sql"
run_sql "$TEST_ROOT/template-management.sql"
"$TEST_ROOT/concurrency-local.sh" "$SOCKET_DIR"
run_sql "$TEST_ROOT/scheduled-date.sql"
run_sql "$TEST_ROOT/scheduled-attendance-groups.sql"
