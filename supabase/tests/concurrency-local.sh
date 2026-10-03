#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: supabase/tests/concurrency-local.sh <postgres-socket-directory>" >&2
  exit 2
fi

SOCKET_DIR="$1"
TEST_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/moc-scheduled-concurrency.XXXXXX")"
PSQL=(psql -h "$SOCKET_DIR" -p 5432 -U "$(id -un)" -d postgres --no-psqlrc -v ON_ERROR_STOP=1)
ACTOR='20000000-0000-4000-8000-000000000002'
PID_A=''

cleanup() {
  local status=$?
  if [ -n "$PID_A" ]; then kill "$PID_A" >/dev/null 2>&1 || true; fi
  if [ "$status" -ne 0 ]; then
    for log_file in "$LOG_DIR"/*.log; do
      [ -f "$log_file" ] || continue
      echo "--- $(basename "$log_file") ---" >&2
      cat "$log_file" >&2
    done
  fi
  python3 -c 'import pathlib, shutil, sys; shutil.rmtree(pathlib.Path(sys.argv[1]), ignore_errors=True)' "$LOG_DIR"
}
trap cleanup EXIT

query() {
  "${PSQL[@]}" -A -t -c "$1"
}

wait_for_marker() {
  local log_file="$1" marker="$2" attempt=0
  while [ "$attempt" -lt 200 ]; do
    if rg -q "$marker" "$log_file"; then return 0; fi
    if [ -n "$PID_A" ] && ! kill -0 "$PID_A" >/dev/null 2>&1; then
      echo "Session A exited before reaching $marker" >&2
      cat "$log_file" >&2
      return 1
    fi
    sleep 0.01
    attempt=$((attempt + 1))
  done
  echo "Timed out waiting for $marker" >&2
  cat "$log_file" >&2
  return 1
}

OCCURRENCE="$(query "SELECT o.id FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id JOIN public.scheduled_message_templates t ON t.id=s.template_id WHERE t.name='Recurring attendance' AND o.occurrence_on=(clock_timestamp() AT TIME ZONE s.timezone)::date+6 AND o.state='scheduled' AND o.expires_at>clock_timestamp()")"
if [[ ! "$OCCURRENCE" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "Could not find the eligible recurring test occurrence" >&2
  exit 1
fi

# Two callers race to enqueue the same occurrence. A's explicit row lock keeps
# the first RPC transaction open while B attempts the same operation.
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -v actor="$ACTOR" -f "$TEST_ROOT/concurrency-request-a.sql" >"$LOG_DIR/request-a.log" 2>&1 &
PID_A=$!
wait_for_marker "$LOG_DIR/request-a.log" REQUEST_LOCKED
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -v actor="$ACTOR" -f "$TEST_ROOT/concurrency-request-b.sql" >"$LOG_DIR/request-b.log" 2>&1
wait "$PID_A"
PID_A=''
SEND_COUNT="$(query "SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id='$OCCURRENCE' AND scheduled_operation='send'")"
if [ "$SEND_COUNT" != '1' ]; then
  echo "Concurrent manual-send requests created $SEND_COUNT queue rows, expected one" >&2
  exit 1
fi

# Deliver it once to create an original Telegram message, then race two edits
# that were both opened at the same revision. Exactly one may write.
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -f "$TEST_ROOT/concurrency-send.sql" >"$LOG_DIR/send.log" 2>&1
REVISION="$(query "SELECT revision FROM public.scheduled_message_occurrences WHERE id='$OCCURRENCE'")"
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -v actor="$ACTOR" -v revision="$REVISION" -f "$TEST_ROOT/concurrency-edit-a.sql" >"$LOG_DIR/edit-a.log" 2>&1 &
PID_A=$!
wait_for_marker "$LOG_DIR/edit-a.log" REVISION_LOCKED
set +e
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -v actor="$ACTOR" -v revision="$REVISION" -f "$TEST_ROOT/concurrency-edit-b.sql" >"$LOG_DIR/edit-b.log" 2>&1
EDIT_B_STATUS=$?
set -e
wait "$PID_A"
PID_A=''
if [ "$EDIT_B_STATUS" -eq 0 ] || ! rg -q 'Message changed; reopen it before applying' "$LOG_DIR/edit-b.log"; then
  echo "Concurrent stale edit did not fail with the revision conflict" >&2
  cat "$LOG_DIR/edit-b.log" >&2
  exit 1
fi
WINNER_COUNT="$(query "SELECT count(*) FROM public.scheduled_message_occurrences WHERE id='$OCCURRENCE' AND revision=$((REVISION + 1)) AND fields->>'title'='Parallel winner'")"
if [ "$WINNER_COUNT" != '1' ]; then
  echo "Expected exactly one same-revision edit to win" >&2
  exit 1
fi

NEXT_REVISION="$(query "SELECT revision FROM public.scheduled_message_occurrences WHERE id='$OCCURRENCE'")"
"${PSQL[@]}" -v occurrence="$OCCURRENCE" -v actor="$ACTOR" -v revision="$NEXT_REVISION" \
  -f "$TEST_ROOT/concurrency-edit-second.sql" >"$LOG_DIR/second-edit.log" 2>&1
EDIT_IDS=($(query "SELECT id FROM public.notification_deliveries WHERE scheduled_occurrence_id='$OCCURRENCE' AND scheduled_operation='edit' ORDER BY created_at,id LIMIT 2"))
if [ "${#EDIT_IDS[@]}" -ne 2 ]; then
  echo "Expected two distinct edit deliveries for lease contention" >&2
  exit 1
fi
"${PSQL[@]}" -c "UPDATE public.notification_deliveries SET status='processing' WHERE id IN ('${EDIT_IDS[0]}','${EDIT_IDS[1]}')" >"$LOG_DIR/claim-edits.log" 2>&1

# A's edit claim holds the occurrence row through commit. B then sees the live
# lease and returns busy instead of synchronizing concurrently to Telegram.
"${PSQL[@]}" -v delivery="${EDIT_IDS[0]}" -f "$TEST_ROOT/concurrency-begin-a.sql" >"$LOG_DIR/begin-a.log" 2>&1 &
PID_A=$!
wait_for_marker "$LOG_DIR/begin-a.log" DELIVERY_LEASE_HELD
"${PSQL[@]}" -v delivery="${EDIT_IDS[1]}" -f "$TEST_ROOT/concurrency-begin-b.sql" >"$LOG_DIR/begin-b.log" 2>&1
wait "$PID_A"
PID_A=''
if ! rg -q '"busy": true' "$LOG_DIR/begin-b.log"; then
  echo "Second concurrent edit claim did not report a live delivery lease" >&2
  cat "$LOG_DIR/begin-b.log" >&2
  exit 1
fi

# Session restart uses the same unique owner/chat key and rotates the session
# id atomically; a racing restart leaves one active row owned by the winner.
"${PSQL[@]}" -f "$TEST_ROOT/concurrency-session-a.sql" >"$LOG_DIR/session-a.log" 2>&1 &
PID_A=$!
wait_for_marker "$LOG_DIR/session-a.log" SESSION_UPSERTED
"${PSQL[@]}" -f "$TEST_ROOT/concurrency-session-b.sql" >"$LOG_DIR/session-b.log" 2>&1
wait "$PID_A"
PID_A=''
SESSION_STATE="$(query "SELECT count(*)||':'||min(id::text)||':'||min(data->>'flow') FROM public.scheduled_message_sessions WHERE telegram_user_id='tg-editor' AND chat_id='-1000000000001'")"
if [ "$SESSION_STATE" != '1:40000000-0000-4000-8000-000000000002:restarted' ]; then
  echo "Concurrent session restart left unexpected owner state: $SESSION_STATE" >&2
  exit 1
fi

echo "Concurrent queue, edit revision, delivery lease, and session-upsert checks passed."
