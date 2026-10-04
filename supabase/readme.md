# Supabase database scripts

This directory is the database source of truth for the MoC Console Supabase
project (`jypshhgfuvwmtbbcxmhs`). Historical schema reconciliation completed on
2026-08-05; subsequent changes are tracked with stable numeric migration history IDs.

## Which script to use

- For the existing MoC Console project, run
  [`verify-current-schema.sql`](verify-current-schema.sql) first. Apply every
  unapplied upgrade listed in [`migrations/manifest.tsv`](migrations/manifest.tsv),
  in manifest order, then run the verification report again. Do not reapply a
  migration because its filename changed: the manifest retains its original
  version and name for comparison with `supabase_migrations.schema_migrations`.
- To converge an older or partially migrated MoC Console database (one that
  predates the 2026-08-05 reconciliation), back it up and run
  [`migrations/2026-08-04-moc-console-target-schema-cleanup.sql`](migrations/2026-08-04-moc-console-target-schema-cleanup.sql),
  then apply the unapplied upgrades in the manifest. The cleanup is atomic
  and accepts both the legacy schema and the 2026-08-05 target. It permanently
  removes retired feature tables when they still exist. Do not re-run it on a
  database that already has later migrations: they replace functions it
  references.
- For a blank project, run
  [`build-fresh-database.sh`](build-fresh-database.sh) with the project's
  connection string. It applies `phase-01`..`phase-03`, the target-schema
  cleanup and then the manifest's upgrades in order, recording their original
  IDs in `supabase_migrations.schema_migrations`. Finish with
  `verify-current-schema.sql`. Add each new upgrade to the manifest.
- [`phase-00-nuke.sql`](phase-00-nuke.sql) is development-only and destroys
  all application, Auth, Storage, and cron data. Never use it as an upgrade.

All SQL upgrades and historical patches now live in `migrations/` and use
`YYYY-MM-DD[-letter]-description.sql` names (the letter orders multiple upgrades
on one date). The manifest lists only upgrades that follow the consolidated
baseline. Historical May–August 4 scripts are an audit ledger: several create
media, playlist, or cue-sheet objects that later scripts intentionally remove.
Do not replay every SQL file in this folder against a fresh or current database.

These readable filenames are not discovered by the Supabase CLI's numeric
`<version>_<name>.sql` convention. Apply needed scripts through the SQL editor
or `psql`; tools that require CLI filenames must stage copies using the manifest's
original version and name. The fresh-database build already preserves those IDs.
Moving files does not alter the hosted database or its migration history.

## Post-migration target

After the reliability migration, the target has 40 public application tables,
all with RLS enabled. Authorization is workspace-scoped through
`workspace_users.role_id`; new accounts create `workspace_join_requests` and
remain pending until approved. OAuth secrets live only in
`private.integration_oauth_tokens`, where provider-token refreshes use a short
lease to protect rotating refresh tokens. The API-owned outbox, Telegram inbox,
signed-ingest replay store, and rate-limit window store are service-role-only.
The legacy `user_roles`, playlist, media library, and cue-sheet tables are
absent. The `media` Storage bucket remains.

The reconciliation recorded these historical migration history entries:

1. `20260804192829_lock_privileged_maintenance_rpcs` — source:
   [`migrations/2026-08-04-lock-privileged-maintenance-rpcs.sql`](migrations/2026-08-04-lock-privileged-maintenance-rpcs.sql)
2. `20260804193507_harden_function_execution` — source:
   [`migrations/2026-08-04-function-execution-hardening.sql`](migrations/2026-08-04-function-execution-hardening.sql)

Other historical changes were applied through the SQL editor or direct SQL and
therefore do not appear in `supabase_migrations.schema_migrations`.

The first tracked reliability migration is:

3. `20260805120000_api_reliability_hardening` — source:
   [`migrations/2026-08-05a-api-reliability-hardening.sql`](migrations/2026-08-05a-api-reliability-hardening.sql).
   It must be applied after the two historical migration entries above. It adds
   atomic OAuth connection/token RPCs, rotating-refresh leases, durable
   notification and Telegram boundaries, fixed-window API rate limits, and missing foreign-key indexes.
4. `20260805130000_zoom_marketplace_deauthorization` — source:
   [`migrations/2026-08-05b-zoom-marketplace-deauthorization.sql`](migrations/2026-08-05b-zoom-marketplace-deauthorization.sql).
   It removes Zoom host start URLs, handles verified Marketplace deauthorization,
   and keeps direct meeting deletion, reconnection, and deauthorization from
   leaving meeting-derived notification rows behind. Zoom meeting rows are
   anchored to the specific connection identity, so an old-account sync cannot
   recreate meetings after a disconnect or account replacement.
5. `20260808120000_stale_alert_episode_semantics` — source:
   [`migrations/2026-08-08-stale-alert-episode-semantics.sql`](migrations/2026-08-08-stale-alert-episode-semantics.sql).
   It makes the stale threshold an initial activity threshold rather than a
   repeating reminder cadence, while preserving one alert when a booking newly
   becomes overdue.
6. `20260810120000_stream_created_notification_skips_finished_streams` — source:
   [`migrations/2026-08-10a-stream-created-notification-skips-finished-streams.sql`](migrations/2026-08-10a-stream-created-notification-skips-finished-streams.sql).
   It stops the stream-created announcement firing for streams that already
   completed before the row reached the console.
7. `20260810130000_delete_finished_streams_and_meetings` — source:
   [`migrations/2026-08-10b-delete-finished-streams-and-meetings.sql`](migrations/2026-08-10b-delete-finished-streams-and-meetings.sql).
   It lets finished streams and past meetings be deleted without leaving
   derived notification rows behind.
8. `20260814120000_true_stale_days_and_silent_auto_archive` — source:
   [`migrations/2026-08-14-true-stale-days-and-silent-auto-archive.sql`](migrations/2026-08-14-true-stale-days-and-silent-auto-archive.sql).
   It makes the stale claim RPCs report the real days-since-activity and keeps
   the weekly auto-archive cron silent while manual status changes keep
   notifying.
9. `20260818120000_checklist_item_assignment_without_duty` — source:
   [`migrations/2026-08-18a-checklist-item-assignment-without-duty.sql`](migrations/2026-08-18a-checklist-item-assignment-without-duty.sql).
   It retires the per-assignment `duty` label on checklist items, collapsing
   duplicate member rows and narrowing the uniqueness key to
   (checklist_item_id, user_id). Request assignments keep their duty. Apply it
   BEFORE the console and API deploys: the console upserts on the narrower
   conflict target and no longer sends a duty, so neither write is accepted by
   the old shape. The migration is not backward compatible in the other
   direction either — deploy the code immediately after it.
10. `20260818130000_youtube_channel_replacement_clears_inflight_streams` — source:
    [`migrations/2026-08-18b-youtube-channel-replacement-clears-inflight-streams.sql`](migrations/2026-08-18b-youtube-channel-replacement-clears-inflight-streams.sql).
    A workspace that authorises a different YouTube channel now has its in-flight
    streams cleared during the reconnect, the way replacing a Zoom account already
    clears its meetings. Without it the daily stream-sync cron compares the new
    channel against the connection row the reconnect just rewrote and deletes the
    old channel's streams unattended. Finished streams are kept. Apply it before
    the stream-sync cron is scheduled.

11. `20260903120000_restore_broadcast_domain` — source:
    [`migrations/2026-09-03-restore-broadcast-domain.sql`](migrations/2026-09-03-restore-broadcast-domain.sql).
    It restores a minimal Broadcast domain after the July 2026 removal, with
    workspace-scoped `broadcasts` and `broadcast_items` tables, a public
    `broadcast-media` Storage bucket and the original publish, loop, and preload
    controls used by the first player implementation.

12. `20260904100000_broadcast_invariants_and_atomic_playlist_writes` — source:
    [`migrations/2026-09-04a-broadcast-invariants-and-atomic-playlist-writes.sql`](migrations/2026-09-04a-broadcast-invariants-and-atomic-playlist-writes.sql).
    It removes the temporary publish, loop, and preload settings; makes every
    broadcast publicly readable and continuously looping; enables Realtime for
    playlist changes; and adds permission-checked transactional functions for
    creating and replacing playlists without exposing partial database state.

13. `20260904140000_venue_booking_domain` — source:
    [`migrations/2026-09-04b-venue-booking-domain.sql`](migrations/2026-09-04b-venue-booking-domain.sql).
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
    [`migrations/2026-09-04c-venue-booking-data-api-grants.sql`](migrations/2026-09-04c-venue-booking-data-api-grants.sql).
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

15. `20260909120000_delete_broadcast_with_items` — source:
    [`migrations/2026-09-09-delete-broadcast-with-items.sql`](migrations/2026-09-09-delete-broadcast-with-items.sql).
    It adds a permission-checked broadcast deletion RPC that removes the
    playlist rows transactionally and returns their Storage paths so the console
    can delete every uploaded media object after its database reference is gone.

16. `20260912120000_venue_events_and_lean_venue_bookings` — source:
    [`migrations/2026-09-12-venue-events-and-lean-venue-bookings.sql`](migrations/2026-09-12-venue-events-and-lean-venue-bookings.sql).
    It adds workspace-managed venue event types and narrows public venue
    bookings to the requested venue, event, requester, and reserved slots.

17. `20260920120000_public_submission_management` — source:
    [`migrations/2026-09-20-public-submission-management.sql`](migrations/2026-09-20-public-submission-management.sql).
    It adds workspace-managed request categories (including defaults for new
    workspaces), 12-hex tracking codes for
    new submissions, editable equipment-request labels, and service-role-only
    lookup, update, and delete RPCs for tracked requests, equipment bookings,
    and venue bookings. Mutations use the prior `updated_at` value for
    optimistic concurrency, reject terminal or already-started records, update
    venue slots transactionally, and enqueue distinct requester update/delete
    events with durable snapshots. Browser clients must reach these functions
    through the MoC API; the former anonymous tracking lookup grant is removed.

    Apply this migration before deploying the matching API, request app, and
    console. Deploy those applications together immediately afterward: the
    request app expects managed categories and the new API boundary, while the
    console expects the category relation on request reads.

18. `20260925120000_remove_bug_reports` — source:
    [`migrations/2026-09-25-remove-bug-reports.sql`](migrations/2026-09-25-remove-bug-reports.sql).
    It permanently removes the retired `bug_reports` table, its trigger helper,
    and the `bug_report_status` enum. Back up any reports that must be retained
    before applying it.

19. `20260927002902_venue_booking_recurrence` — source:
    [`migrations/2026-09-27a-venue-booking-recurrence.sql`](migrations/2026-09-27a-venue-booking-recurrence.sql).
    It keeps each repeated venue booking as one parent record with a compact
    recurrence rule, while materialising every occurrence into
    `venue_booking_slots`. The existing active-slot unique index therefore
    rejects a clash anywhere in the series atomically. Tracking updates
    replace the projection in one transaction, shortening a series releases
    its removed future slots, and console calendars expand the indexed slots
    back into individual occurrences.

20. `20260927120000_reject_workspace_join_request` — source:
    [`migrations/2026-09-27b-reject-workspace-join-request.sql`](migrations/2026-09-27b-reject-workspace-join-request.sql).
    It adds `reject_workspace_join_request(uuid)`, which lets a workspace
    manager delete a pending access request without creating a membership.
    Apply it before deploying the console that shows the Reject action.

21. `20260927130000_venue_booking_approval_states` and
    `20260927130100_venue_booking_approval_and_telegram_actions` — sources:
    [`migrations/2026-09-27c-venue-booking-approval-states.sql`](migrations/2026-09-27c-venue-booking-approval-states.sql),
    [`migrations/2026-09-27d-venue-booking-approval-and-telegram-actions.sql`](migrations/2026-09-27d-venue-booking-approval-and-telegram-actions.sql).
    Apply them in order; the first only adds the `approved` and `rejected`
    enum values because Postgres cannot use a new enum value in the
    transaction that adds it. Venue bookings stay `auto` (booked, awaiting a
    decision, holding their slots) until staff approve or reject them;
    rejection releases the slots exactly like cancellation, and moving an
    approved booking resets it to `auto`. Notification deliveries now record
    the entity they announce, their inline keyboard, and the original a
    follow-up replied to, so later events edit the original Telegram message
    instead of posting a new one. `api_apply_telegram_action` (service role
    only) applies Telegram inline-button transitions for linked users with
    update permission, attributing the change to them. It also adds the
    `telegram_mini_app` API rate-limit policy.

22. `20260927130200_telegram_webhook_duplicate_claim` — source:
    [`migrations/2026-09-27e-telegram-webhook-duplicate-claim.sql`](migrations/2026-09-27e-telegram-webhook-duplicate-claim.sql).
    A duplicate Telegram update that arrives while the original is still
    processing is now reported as `in_progress` (a retryable 503) instead of
    the raw `processing` status, which the API did not recognise and which
    made it mark the still-running original as failed.

23. `20260927130300_broadcast_media_delete_policy_initplan` — source:
    [`migrations/2026-09-27f-broadcast-media-delete-policy-initplan.sql`](migrations/2026-09-27f-broadcast-media-delete-policy-initplan.sql).
    Recreates the `broadcast_media_bucket_delete` storage policy with
    `(select auth.uid())` so it is evaluated once per statement. The rule
    itself is unchanged.

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
- [`migrations/2026-07-28-remove-playlists-media-and-cue-sheet.sql`](migrations/2026-07-28-remove-playlists-media-and-cue-sheet.sql)
  removed retired domains.
- [`migrations/2026-07-31-restore-checklists.sql`](migrations/2026-07-31-restore-checklists.sql),
  [`migrations/2026-08-03-checklist-scheduled-dates.sql`](migrations/2026-08-03-checklist-scheduled-dates.sql),
  and [`migrations/2026-08-04-checklist-run-request-links.sql`](migrations/2026-08-04-checklist-run-request-links.sql)
  restored standalone checklist workflows.
- [`migrations/2026-08-04-consolidated-live-schema-update.sql`](migrations/2026-08-04-consolidated-live-schema-update.sql)
  was the non-destructive rollout bundle. It is superseded by the target-schema
  cleanup and is retained only for audit history.
- The data-boundary, notification outbox, request history, workspace access,
  and function-execution patches are all folded into
  [`migrations/2026-08-04-moc-console-target-schema-cleanup.sql`](migrations/2026-08-04-moc-console-target-schema-cleanup.sql).

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
submission RPCs because they are `SECURITY DEFINER`; those functions validate
the workspace and submitted values. Tracking lookup and mutation RPCs are
service-role-only and sit behind the MoC API's origin checks and rate limits.
Maintenance RPCs and OAuth-token RPCs are service-role-only. The notification
queue tables intentionally have RLS without client policies because they are
also service-role-only.

Stale-item alerts are retired by
[`2026-09-30b-remove-stale-item-alerts.sql`](migrations/2026-09-30b-remove-stale-item-alerts.sql).
It removes the alert recipient table, threshold and bookkeeping columns, claim
and completion RPCs, and stale-event routes and deliveries. Auto-archive and
message-format settings remain. The API deployment removes the stale-items cron.

The expected-arrival upgrade is
[`migrations/2026-10-03f-remove-expected-arrival.sql`](migrations/2026-10-03f-remove-expected-arrival.sql).
It removes the pre-attendance expected-arrival field, preserves existing guidance
in instructions or custom body text, converts recurring overrides, and queues
edits for active sent occurrences. Personal attendee arrival times are untouched.

The date-variable upgrade is
[`migrations/2026-10-04a-scheduled-message-date.sql`](migrations/2026-10-04a-scheduled-message-date.sql).
It permits an optional date-only variable for announcements and pre-attendance,
validates Gregorian `YYYY-MM-DD` values, and keeps existing templates unchanged.
The renderer displays year, month, day without separators, subtracting 1983
from the year: `2026-10-04` becomes `431004`. This content date is independent of delivery and expiry.


The attendance-groups upgrade is [`migrations/2026-10-04b-scheduled-attendance-groups.sql`](migrations/2026-10-04b-scheduled-attendance-groups.sql). It stores validated ordered group snapshots on templates, schedules and occurrences, adds nullable response group IDs, and extends attendance/admin RPCs while retaining the existing authorization grants and occurrence revisions. Group removal is rejected atomically when an affected live response uses that group.

The resend upgrade is [`migrations/2026-10-04c-scheduled-message-resend.sql`](migrations/2026-10-04c-scheduled-message-resend.sql). It adds a revision-checked, service-role-only resend RPC and extends the existing delivery queue. Resends retain the occurrence and responses, store the new Telegram message ID on success, and prevent automatic retry after an ambiguous outcome.
