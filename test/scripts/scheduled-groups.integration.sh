#!/usr/bin/env bash
# Explicit integration command: test/scripts/scheduled-groups.integration.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT="${MOC_GROUPS_INTEGRATION_REPORT:-/tmp/moc-groups-integration-report.md}"
for command in bun initdb pg_ctl psql python3; do
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
  status=$?
  cleanup_bridge
  if ((status != 0)); then
    printf '\n## Run status\n\nFAIL: integration command exited with status %s; see the test output above for the failing assertion or command.\n' "$status" >> "$REPORT"
  fi
}
trap record_failure EXIT
MIGRATIONS=(
  "$ROOT/supabase/migrations/2026-10-03a-workspace-member-types.sql"
  "$ROOT/supabase/migrations/2026-10-03b-scheduled-messages.sql"
  "$ROOT/supabase/migrations/2026-10-03c-scheduled-message-actions.sql"
  "$ROOT/supabase/migrations/2026-10-03d-scheduled-message-composition.sql"
  "$ROOT/supabase/migrations/2026-10-03e-scheduled-template-management.sql"
  "$ROOT/supabase/migrations/2026-10-03f-remove-expected-arrival.sql"
  "$ROOT/supabase/migrations/2026-10-04a-scheduled-message-date.sql"
  "$ROOT/supabase/migrations/2026-10-04b-scheduled-attendance-groups.sql"
  "$ROOT/supabase/migrations/2026-10-04c-scheduled-message-resend.sql"
)

{
  printf '# Attendee-selected groups integration verification\n\n'
  printf 'Date: %s\n\n' "$(date -Iseconds)"
  printf 'This run uses disposable local PostgreSQL clusters on private Unix sockets. It does not read application env files or contact hosted Supabase or Telegram.\n\n'
  printf '## PostgreSQL to production renderer bridge\n\n'
  BRIDGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/moc-groups-render.XXXXXX")"
  mkdir "$BRIDGE_DIR/socket"
  initdb -D "$BRIDGE_DIR/data" --no-locale --encoding=UTF8 >/dev/null
  pg_ctl -D "$BRIDGE_DIR/data" -o "-h '' -k $BRIDGE_DIR/socket -p 5432" -l "$BRIDGE_DIR/postgres.log" start >/dev/null
  DB_ARGS=(-h "$BRIDGE_DIR/socket" -p 5432 -U "$(id -un)" -d postgres --no-psqlrc -v ON_ERROR_STOP=1)
  psql "${DB_ARGS[@]}" -f "$ROOT/test/supabase/tests/fixture.sql" >/dev/null
  psql "${DB_ARGS[@]}" -f "$ROOT/test/supabase/tests/seed.sql" >/dev/null
  for migration in "${MIGRATIONS[@]}"; do
    psql "${DB_ARGS[@]}" -f "$migration" >/dev/null
  done
  psql "${DB_ARGS[@]}" -qAt -f "$ROOT/test/scripts/scheduled-groups-render.integration.sql" > "$BRIDGE_DIR/renderer.json"
  bun "$ROOT/test/scripts/scheduled-groups-render.integration.ts" "$BRIDGE_DIR/renderer.json"
  printf '\nPASS: SQL-generated occurrence and response JSON was consumed by the production renderer, with selected group/time, title and stable Telegram message ID asserted.\n\n'
  cleanup_bridge

  printf '## Full PostgreSQL lifecycle\n\n'
  "$ROOT/test/supabase/tests/run-local.sh" "${MIGRATIONS[@]}"
  printf '\nPASS: migration fixture, scheduled lifecycle assertions, concurrency checks, and attendee group SQL assertions.\n\n'
  printf '## Production application paths\n\n'
  cd "$ROOT"
  bun test \
    test/apps/api/server/scheduled-messages/telegram-flow.test.ts \
    test/apps/api/server/scheduled-messages/delivery.test.ts \
    test/apps/api/server/scheduled-messages/delivery-edges.test.ts \
    test/apps/api/server/scheduled-messages/resend.test.ts \
    test/packages/notifications/src/scheduled-attendance-groups.test.ts \
    test/packages/notifications/src/scheduled-attendance-group-validation.test.ts
  printf '\nPASS: production Telegram handlers, delivery renderer integration, group roster rendering, escaping, expiry presentation, and group validation tests.\n\n'
  printf '## Coverage boundary\n\n'
  printf 'The database-to-renderer bridge uses actual occurrence and respondent rows produced by SQL RPCs, then invokes the production TypeScript renderer. Telegram HTTP delivery remains covered by its production-handler fixture, which captures provider calls without contacting Telegram.\n'
}

printf '\nWrote %s\n' "$REPORT"
