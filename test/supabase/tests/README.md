# Local scheduled-message SQL tests

`run-local.sh` starts a fresh PostgreSQL cluster bound to a private Unix socket,
loads the minimal Supabase-shaped fixtures, applies the SQL files passed on the
command line in order, runs `assertions.sql`, then races two local `psql`
sessions through duplicate send requests, stale same-revision edits, concurrent
delivery claims, and session restarts. The cluster and its data are removed
when the command exits. It never reads application environment files or
connects to a hosted database.

Requirements are local `initdb`, `pg_ctl`, `psql`, and Python 3. The fixture is
not a replacement for a Supabase deployment: it models only the authorization
and Telegram delivery tables needed by this feature's migrations.

Example after the migrations are present:

```sh
test/supabase/tests/run-local.sh \
  supabase/migrations/2026-10-03a-workspace-member-types.sql \
  supabase/migrations/2026-10-03b-scheduled-messages.sql \
  supabase/migrations/2026-10-03c-scheduled-message-actions.sql \
  supabase/migrations/2026-10-03d-scheduled-message-composition.sql \
  supabase/migrations/2026-10-03e-scheduled-template-management.sql \
  supabase/migrations/2026-10-03f-remove-expected-arrival.sql \
  supabase/migrations/2026-10-04a-scheduled-message-date.sql \
  supabase/migrations/2026-10-04b-scheduled-attendance-groups.sql \
  supabase/migrations/2026-10-04c-scheduled-message-resend.sql \
  supabase/migrations/2026-10-04d-scheduled-message-timestamps.sql
```

The assertion script checks migration backfills and defaults; Editor and
Viewer classification and RLS behavior; one-off and recurring schedules;
manual versus automatic sends; revision checks and field validation; scoped
edits and expiry; roster filtering, freeze, and response retention; delivery
claims, duplicate prevention, and ambiguous-send recovery. It temporarily
converts a boundary schedule to a one-off inside a transaction to verify the
materializer applies a stored change to a previously unmaterialized date beyond
day 32, then rolls back. Composition checks verify template edits preserve
identity and existing schedule/occurrence snapshots, enforce workspace and
Editor permissions, reject read-only fields, and merge schedule-specific field
overrides without changing template defaults. It invokes service RPCs under
`service_role` and changes to `authenticated` for RLS checks. Fixture data and
database state are discarded after each run.

`template-management.sql` checks stable creation IDs, retry-safe deletion,
permission/workspace checks, rejection of deleted templates for editing or
new schedules, and preservation of already-created schedules and occurrences.

The arrival-field migration is wrapped with legacy fixtures and post-migration
checks. These verify instruction backfills, future recurring overrides beyond
the materialization horizon, attendee response retention, original Telegram
message IDs, queued edits, and removal of obsolete admin input sessions.

The attendance-groups suite checks group shape and labels, template and schedule snapshots, one-off and recurring sends, atomic attendee group/status/time updates, forged IDs, unlinked and expired responses, declining cleanup, occurrence/future/series edits, used-group removal protection, beyond-horizon patch materialization, fresh awaiting responses, and preservation of sent Telegram message identity.

## Resend coverage

Include `supabase/migrations/2026-10-04c-scheduled-message-resend.sql` after the
attendance-groups migration when using `run-local.sh`. `scheduled-resend.sql`
checks permissions, duplicate requests, frozen response retention, replacement
message identity, failed/ambiguous/crashed resends and expiry.

The timestamp assertions verify exact send/expiry instants, fractional recurring intervals, no early sending, timezone delivery snapshots, scoped expiry edits and expired action rejection.
