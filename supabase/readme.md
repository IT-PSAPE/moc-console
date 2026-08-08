# Supabase database scripts

This directory is the database source of truth for the MoC Console Supabase
project (`jypshhgfuvwmtbbcxmhs`). Historical schema reconciliation completed on
2026-08-05; subsequent changes are tracked as normal Supabase migrations.

## Which script to use

- For the existing MoC Console project, run
  [`verify-current-schema.sql`](verify-current-schema.sql) first. Apply every
  unapplied file in [`migrations/`](migrations/) through the normal Supabase
  migration workflow, then run the verification report again. Do not apply a
  migration directly to production from this repository without a reviewed
  backup and deployment plan.
- To converge an older or partially migrated MoC Console database, back it up
  and run
  [`patches/2026-08-04-moc-console-target-schema-cleanup.sql`](patches/2026-08-04-moc-console-target-schema-cleanup.sql).
  It is atomic and accepts both the legacy schema and the already-clean target
  schema. It permanently removes retired feature tables when they still exist.
- For a blank project, run [`phase-01-schema.sql`](phase-01-schema.sql),
  [`phase-02-logic.sql`](phase-02-logic.sql), and
  [`phase-03-security.sql`](phase-03-security.sql), then run the target-schema
  cleanup above to converge the historical baseline to the current product.
- [`phase-00-nuke.sql`](phase-00-nuke.sql) is development-only and destroys
  all application, Auth, Storage, and cron data. Never use it as an upgrade.

Do not run every file in `patches/` against a fresh or current database. The
directory is a chronological audit ledger: several early patches create media,
playlist, or cue-sheet objects that later patches intentionally remove.

## Post-migration target

After the reliability migration, the target has 36 public application tables,
all with RLS enabled. Authorization is workspace-scoped through
`workspace_users.role_id`; new accounts create `workspace_join_requests` and
remain pending until approved. OAuth secrets live only in
`private.integration_oauth_tokens`, where provider-token refreshes use a short
lease to protect rotating refresh tokens. The API-owned outbox, Telegram inbox,
signed-ingest replay store, and rate-limit window store are service-role-only.
The legacy `user_roles`, playlist, media library, and cue-sheet tables are
absent. The `media` Storage bucket remains.

The only entries currently recorded in Supabase migration history are:

1. `20260804192829_lock_privileged_maintenance_rpcs` — source:
   [`patches/2026-08-04-lock-privileged-maintenance-rpcs.sql`](patches/2026-08-04-lock-privileged-maintenance-rpcs.sql)
2. `20260804193507_harden_function_execution` — source:
   [`patches/2026-08-04-function-execution-hardening.sql`](patches/2026-08-04-function-execution-hardening.sql)

Other historical changes were applied through the SQL editor or direct SQL and
therefore do not appear in `supabase_migrations.schema_migrations`.

The first tracked reliability migration is:

3. `20260805120000_api_reliability_hardening` — source:
   [`migrations/20260805120000_api_reliability_hardening.sql`](migrations/20260805120000_api_reliability_hardening.sql).
   It must be applied after the two historical migration entries above. It adds
   atomic OAuth connection/token RPCs, rotating-refresh leases, durable
   notification and Telegram boundaries, fixed-window API rate limits, stale
   notification completion semantics, and missing foreign-key indexes.
4. `20260805130000_zoom_marketplace_deauthorization` — source:
   [`migrations/20260805130000_zoom_marketplace_deauthorization.sql`](migrations/20260805130000_zoom_marketplace_deauthorization.sql).
   It removes Zoom host start URLs, handles verified Marketplace deauthorization,
   and keeps direct meeting deletion, reconnection, and deauthorization from
   leaving meeting-derived notification rows behind. Zoom meeting rows are
   anchored to the specific connection identity, so an old-account sync cannot
   recreate meetings after a disconnect or account replacement.
5. `20260808120000_stale_alert_episode_semantics` — source:
   [`migrations/20260808120000_stale_alert_episode_semantics.sql`](migrations/20260808120000_stale_alert_episode_semantics.sql).
   It makes the stale threshold an initial activity threshold rather than a
   repeating reminder cadence, while preserving one alert when a booking newly
   becomes overdue.

## Script history

The phase files are the consolidated historical baseline:

- [`phase-01-schema.sql`](phase-01-schema.sql) — extensions, enums, tables,
  indexes, and structural seed data.
- [`phase-02-logic.sql`](phase-02-logic.sql) — functions, triggers, and RPCs.
- [`phase-03-security.sql`](phase-03-security.sql) — RLS, policies, Storage,
  and grants.

The patch ledger records how that baseline evolved:

- May–June feature evolution: media metadata, playlist positioning,
  notification templates/settings, profile fields, booking batches, and
  archive automation. These are historical because some affected domains were
  later retired.
- [`patches/2026-07-28-remove-playlists-media-and-cue-sheet.sql`](patches/2026-07-28-remove-playlists-media-and-cue-sheet.sql)
  removed retired domains.
- [`patches/2026-07-31-restore-checklists.sql`](patches/2026-07-31-restore-checklists.sql),
  [`patches/2026-08-03-checklist-scheduled-dates.sql`](patches/2026-08-03-checklist-scheduled-dates.sql),
  and [`patches/2026-08-04-checklist-run-request-links.sql`](patches/2026-08-04-checklist-run-request-links.sql)
  restored standalone checklist workflows.
- [`patches/2026-08-04-consolidated-live-schema-update.sql`](patches/2026-08-04-consolidated-live-schema-update.sql)
  was the non-destructive rollout bundle. It is superseded by the target-schema
  cleanup and is retained only for audit history.
- The data-boundary, notification outbox, request history, workspace access,
  and function-execution patches are all folded into
  [`patches/2026-08-04-moc-console-target-schema-cleanup.sql`](patches/2026-08-04-moc-console-target-schema-cleanup.sql).

## Verification notes

The target-schema cleanup was executed against the live schema inside a
transaction ending in `ROLLBACK` on 2026-08-05. Its preflight, migration body,
explicit grants, RLS checks, and final assertions all passed, and production
was left unchanged. That historical check does not apply the reliability
migration above.

`verify-current-schema.sql` now checks the public table set, RLS, critical
column shapes, primary-key presence, required indexes, triggers, service-only
RPC signatures and grants, OAuth-token privacy, and direct `auth.uid()` calls
in policies. It is a drift report rather than a replacement for migration
history: any non-empty report must be investigated before deployment.

Supabase Security Advisor may still report the deliberately anonymous public
submission/tracking RPCs because they are `SECURITY DEFINER`. They are the
public request application boundary and validate a workspace or tracking code.
Maintenance RPCs and OAuth-token RPCs are service-role-only. The notification
queue tables intentionally have RLS without client policies because they are
also service-role-only.
