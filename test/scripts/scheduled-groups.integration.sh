#!/usr/bin/env bash
# Explicit integration command: test/scripts/scheduled-groups.integration.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT="${MOC_GROUPS_INTEGRATION_REPORT:-/tmp/moc-groups-integration-report.md}"
for command in bun initdb pg_ctl psql python3 node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required local command: %s\n' "$command" >&2
    exit 2
  fi
done
exec > >(tee "$REPORT") 2>&1
BRIDGE_DIR=""
cleanup_bridge() {
  if [[ -n "$BRIDGE_DIR" ]]; then
    pg_ctl -D "$BRIDGE_DIR/data" stop -m immediate >/dev/null 2>&1 || true
    python3 -c 'import pathlib, shutil, sys; shutil.rmtree(pathlib.Path(sys.argv[1]), ignore_errors=True)' "$BRIDGE_DIR"
    BRIDGE_DIR=""
  fi
}
record_failure() {
  result=$?
  cleanup_bridge
  if ((result != 0)); then
    printf '\n## Run status\n\nFAIL: integration command exited with status %s; see the test output above.\n' "$result" >> "$REPORT"
  fi
}
trap record_failure EXIT

{
  printf '# Attendee-selected groups PostgreSQL integration verification\n\n'
  printf 'Date: %s\n\n' "$(date -Iseconds)"
  printf 'This run installs the standalone Neon schema into a disposable local PostgreSQL cluster and never reads application env files or contacts external services.\n\n'
  BRIDGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/moc-groups-render.XXXXXX")"
  mkdir "$BRIDGE_DIR/socket"
  initdb -D "$BRIDGE_DIR/data" --no-locale --encoding=UTF8 >/dev/null
  pg_ctl -D "$BRIDGE_DIR/data" -o "-h '' -k $BRIDGE_DIR/socket -p 5432" -l "$BRIDGE_DIR/postgres.log" start >/dev/null
  DB_USER="$(id -un)"
  ENCODED_SOCKET="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$BRIDGE_DIR/socket")"
  DATABASE_URL="postgresql://${DB_USER}@/postgres?host=${ENCODED_SOCKET}&port=5432"
  DB_ARGS=(-h "$BRIDGE_DIR/socket" -p 5432 -U "$DB_USER" -d postgres --no-psqlrc -v ON_ERROR_STOP=1)

  printf '## Standalone schema bootstrap and data fixture\n\n'
  "$ROOT/neon/database/build-fresh-database.sh" "$DATABASE_URL"
  psql "${DB_ARGS[@]}" -f "$ROOT/test/neon/sql/scheduled-fixture.sql" >/dev/null

  printf '\n## PostgreSQL to production renderer bridge\n\n'
  psql "${DB_ARGS[@]}" -qAt -f "$ROOT/test/scripts/scheduled-groups-render.integration.sql" > "$BRIDGE_DIR/renderer.json"
  bun "$ROOT/test/scripts/scheduled-groups-render.integration.ts" "$BRIDGE_DIR/renderer.json"
  printf '\nPASS: SQL-generated occurrence and response JSON was consumed by the production renderer with group, time, title, and stable Telegram message identity asserted.\n\n'

  printf '## Final-schema lifecycle SQL assertions\n\n'
  for test_file in \
    scheduled-attendance-groups.sql \
    scheduled-resend.sql \
    scheduled-deletion.sql \
    scheduled-timestamps.sql \
    template-management.sql \
    telegram-roster.sql; do
    psql "${DB_ARGS[@]}" -f "$ROOT/test/neon/sql/$test_file" >/dev/null
    printf 'PASS: %s\n' "$test_file"
  done
  printf '\n'

  printf '## Production application paths\n\n'
  cd "$ROOT"
  bun test \
    test/apps/api/server/scheduled-messages/telegram-flow.test.ts \
    test/apps/api/server/scheduled-messages/delivery.test.ts \
    test/apps/api/server/scheduled-messages/group-configuration.test.ts \
    test/apps/api/server/scheduled-messages/commands.test.ts \
    test/apps/api/server/scheduled-messages/resend.test.ts \
    test/packages/notifications/src/scheduled-attendance-groups.test.ts \
    test/packages/notifications/src/scheduled-attendance-group-validation.test.ts
  printf '\nPASS: production Telegram handlers, delivery rendering, group roster rendering, expiry presentation, and group validation tests.\n\n'
  printf '## Coverage boundary\n\n'
  printf 'The database-to-renderer bridge uses actual occurrence and respondent rows produced by the standalone PostgreSQL schema. Telegram HTTP delivery remains covered by production-handler fixtures that capture provider calls without contacting Telegram.\n'
}

printf '\nWrote %s\n' "$REPORT"
