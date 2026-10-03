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
  supabase/migrations/20261003150000_workspace_member_types.sql \
  supabase/migrations/20261003160000_scheduled_messages.sql \
  supabase/migrations/20261003170000_scheduled_message_actions.sql \
  supabase/migrations/20261003180000_scheduled_message_composition.sql
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
