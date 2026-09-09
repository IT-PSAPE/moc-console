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

After the reliability migration, the target has 41 public application tables,
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
6. `20260810120000_stream_created_notification_skips_finished_streams` — source:
   [`migrations/20260810120000_stream_created_notification_skips_finished_streams.sql`](migrations/20260810120000_stream_created_notification_skips_finished_streams.sql).
   It stops the stream-created announcement firing for streams that already
   completed before the row reached the console.
7. `20260810130000_delete_finished_streams_and_meetings` — source:
   [`migrations/20260810130000_delete_finished_streams_and_meetings.sql`](migrations/20260810130000_delete_finished_streams_and_meetings.sql).
   It lets finished streams and past meetings be deleted without leaving
   derived notification rows behind.
8. `20260814120000_true_stale_days_and_silent_auto_archive` — source:
   [`migrations/20260814120000_true_stale_days_and_silent_auto_archive.sql`](migrations/20260814120000_true_stale_days_and_silent_auto_archive.sql).
   It makes the stale claim RPCs report the real days-since-activity and keeps
   the weekly auto-archive cron silent while manual status changes keep
   notifying.
9. `20260818120000_checklist_item_assignment_without_duty` — source:
   [`migrations/20260818120000_checklist_item_assignment_without_duty.sql`](migrations/20260818120000_checklist_item_assignment_without_duty.sql).
   It retires the per-assignment `duty` label on checklist items, collapsing
   duplicate member rows and narrowing the uniqueness key to
   (checklist_item_id, user_id). Request assignments keep their duty. Apply it
   BEFORE the console and API deploys: the console upserts on the narrower
   conflict target and no longer sends a duty, so neither write is accepted by
   the old shape. The migration is not backward compatible in the other
   direction either — deploy the code immediately after it.
10. `20260818130000_youtube_channel_replacement_clears_inflight_streams` — source:
    [`migrations/20260818130000_youtube_channel_replacement_clears_inflight_streams.sql`](migrations/20260818130000_youtube_channel_replacement_clears_inflight_streams.sql).
    A workspace that authorises a different YouTube channel now has its in-flight
    streams cleared during the reconnect, the way replacing a Zoom account already
    clears its meetings. Without it the daily stream-sync cron compares the new
    channel against the connection row the reconnect just rewrote and deletes the
    old channel's streams unattended. Finished streams are kept. Apply it before
    the stream-sync cron is scheduled.

11. `20260903120000_restore_broadcast_domain` — source:
    [`migrations/20260903120000_restore_broadcast_domain.sql`](migrations/20260903120000_restore_broadcast_domain.sql).
    It restores a minimal Broadcast domain after the July 2026 removal, with
    workspace-scoped `broadcasts` and `broadcast_items` tables, a public
    `broadcast-media` Storage bucket and the original publish, loop, and preload
    controls used by the first player implementation.

12. `20260904100000_broadcast_invariants_and_atomic_playlist_writes` — source:
    [`migrations/20260904100000_broadcast_invariants_and_atomic_playlist_writes.sql`](migrations/20260904100000_broadcast_invariants_and_atomic_playlist_writes.sql).
    It removes the temporary publish, loop, and preload settings; makes every
    broadcast publicly readable and continuously looping; enables Realtime for
    playlist changes; and adds permission-checked transactional functions for
    creating and replacing playlists without exposing partial database state.

13. `20260904140000_venue_booking_domain` — source:
    [`migrations/20260904140000_venue_booking_domain.sql`](migrations/20260904140000_venue_booking_domain.sql).
    It adds the venue booking domain — `venues`, `venue_bookings` and
    `venue_booking_slots` — as a second public submission flow alongside
    requests and equipment bookings, with the `public_list_venues`,
    `public_venue_availability` and `public_submit_venue_booking` RPCs and a
    third `public_lookup_tracking` branch.

    Two things about it are deliberate and easy to undo by accident:

    - `venue_bookings.status` stores ONLY `'auto'` and `'cancelled'`. Booked →
      in progress → completed is derived from the clock by
      `public.venue_booking_phase()`, so no scheduled job has to run for a
      booking to become "in progress" at its start time, and a Telegram
      message retried an hour later reports the phase that is true when it is
      sent. Do not add a stored lifecycle column.
    - Double-booking is prevented by a partial unique index on
      `venue_booking_slots (venue_id, slot_start) WHERE active`, not by the
      UI. Cancelling releases the slots (`active` goes false) while keeping the
      record of what was booked; un-cancelling reclaims them and correctly
      fails if someone else has taken them since.

    It also generalises `notification_routes`: `group_chat_id` becomes
    nullable, a `user_id` target is added, and a CHECK enforces exactly one
    target, so any event can now be delivered to one person's Telegram DM as
    well as to a group or forum topic. Existing group routes are unaffected,
    but the migration DELETEs pre-existing duplicate routes for the same
    (workspace, event, group, thread) before adding the unique indexes —
    review that against production data before applying.

14. `20260904160000_venue_booking_data_api_grants` — source:
    [`migrations/20260904160000_venue_booking_data_api_grants.sql`](migrations/20260904160000_venue_booking_data_api_grants.sql).
    The venue booking migration granted EXECUTE on its functions but no table
    privileges, and this database is deny-by-default for the Data API roles
    (the target-schema cleanup revoked the schema-wide default privileges for
    `anon`, `authenticated` and `service_role`). Every venue query therefore
    failed with 42501 `permission denied for table venues` before RLS was
    consulted. This migration adds the table grants that mirror the domain
    migration's policies: full CRUD on `venues`, read/update/delete on
    `venue_bookings` (never insert — only the SECURITY DEFINER submit RPC
    writes one), read on `venue_booking_slots`, nothing for `anon`, and all of
    it for `service_role`. Apply it to any database that already has the venue
    booking domain — without it the console's Venues settings tab and the
    venue booking notification enrichment are both dead.

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
