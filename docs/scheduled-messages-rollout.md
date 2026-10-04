# Scheduled messages: rollout and operation

The scheduled-message system reuses the notification delivery queue and daily
cron. Supabase migrations must be applied separately from deploying the code.

## Supabase migrations

These are PostgreSQL scripts for **Supabase**, not Telegram scripts. Review and
back up the target database under the existing migration process, then apply in
this order before deploying the API and Console code:

1. `supabase/migrations/2026-10-03a-workspace-member-types.sql`
2. `supabase/migrations/2026-10-03b-scheduled-messages.sql`
3. `supabase/migrations/2026-10-03c-scheduled-message-actions.sql`
4. `supabase/migrations/2026-10-03d-scheduled-message-composition.sql`
5. `supabase/migrations/2026-10-03e-scheduled-template-management.sql`
6. `supabase/migrations/2026-10-03f-remove-expected-arrival.sql`
7. `supabase/migrations/2026-10-04a-scheduled-message-date.sql`
8. `supabase/migrations/2026-10-04b-scheduled-attendance-groups.sql`

Apply only scripts that are not already applied. The fifth adds retry-safe
template creation and deletion; the sixth removes expected arrival from the
editable fields. The seventh adds the optional date variable; the eighth adds
attendee-selected groups. If the first seven are applied, only the eighth is needed.
Readable filenames retain the original versions in `supabase/migrations/manifest.tsv`;
renaming is not a reason to reapply an upgrade. Historical scripts in that folder
are not part of this feature's rollout.

The sixth migration preserves legacy arrival guidance in instructions for standard
layouts, or as literal text for custom layouts, and folds recurring arrival
changes into instructions. It retains attendee responses and original Telegram
message IDs, queues edits of active sent occurrences, and cancels only admin
sessions editing the retired field. If adding legacy guidance would exceed the
2000-character instruction limit, the transaction stops without partial changes;
shorten the affected instructions and retry.

The first migration backfills every workspace with a renameable Members default
type and assigns existing memberships to it. Security roles are unchanged.
New workspace and membership triggers maintain the default. Editors can manage
classifications, but role assignment and account approval retain their existing
permissions. The remaining migrations add templates, schedules, stable occurrences,
responses and temporary sessions, and extend `notification_deliveries` with
scheduled send/edit/expiry metadata. Domain mutations are service-role RPCs:
browser and Telegram clients cannot supply an actor directly to Supabase.

## Scheduling and lifecycle

Open **Scheduled messages** from the sidebar. Active messages and Templates
have separate views. Use Create template to open the shared rich-text/variable
editor; Source is available for advanced markup. Templates can be edited in
place, and their changes apply to schedules created afterward.
Delete opens a confirmation naming the template. Deleted templates cannot be
edited or used for new schedules. Existing schedules, sent messages and attendance
responses continue unchanged; their template record is retained internally.
Each new draft has a stable creation ID so retries cannot insert a second copy.

Use New message or Use template, fill in the variable values, and choose the
group and schedule. Message-specific values are copied into the schedule without
changing template defaults. Attendance options appear only for pre-attendance;
last recurring date appears only for repeating schedules. Preview and expiry/
timezone details use progressive disclosure.

The layout uses the declared `{{title}}`, `{{instructions}}` and optional `{{date}}` fields.
Date values are stored as Gregorian calendar dates and displayed using the converted
year, for example `2026-10-04` becomes `431004`. Dates are currently fixed values;
relative dates and selectable weekly send days are not implemented yet.
Arrival guidance belongs in instructions, not a separate template variable. Attendance lines and
controls are generated separately. A schedule copies the template, audience and
arrival requirement; later templates do not retroactively rewrite occurrences.

Pre-attendance templates may define 2–8 attendance groups with distinct names,
such as Noon and Evening or In person and Online. Groups are optional and are
copied into the schedule and each occurrence. Stable group IDs survive renaming
and reordering. Template previews show group headings and eligible pending people
under Awaiting response; member types never assign people to attendance groups.

Choose a linked active group/open topic, timezone, first date and once/daily/
weekdays/weekly/monthly calendar rule. Monthly rules skip months without the
selected day (for example, the 31st). Recurring occurrences are materialized
through 32 days ahead, with a 30-day catch-up window. The existing free-plan
daily cron sends all eligible queued messages when it runs. It is not an exact
time scheduler. Send now uses the same queue and can send an upcoming occurrence.
Nothing calls Telegram's native scheduler: bots cannot use it.

Expiry starts as hours after the local send-date midnight. It is independent of
the actual provider send time and each person's arrival time. Manage can change
an occurrence's explicit expiry timestamp or scoped expiry duration. Automatic
schedules require at least 24 expiry hours; shorter durations use manual delivery. Moving
an unsent send date retains the occurrence identity and its explicit expiry;
adjust expiry separately if necessary. Sent dates/destinations are immutable.

Before send, edits change the occurrence data. After send, confirmed edits and
attendance responses atomically queue an edit of the stored Telegram message ID.
Recurring edits offer this occurrence, this and future occurrences, or entire
series; a scoped edit overwrites that field's prior exceptions within its scope.
Unrelated fields and attendee responses remain intact. Expired history is never
revived. A one-off exposes no series choices.

At expiry, active lists and every mutation reject the occurrence immediately.
The next daily worker marks the Telegram card closed and removes its keyboard.
Old visible buttons can therefore remain briefly but cannot change anything.
Database occurrence and response history is retained.

## Telegram setup

After deployment, use Sync Telegram commands from the Scheduled messages page (the daily
worker also refreshes them). Commands are scoped per linked chat member, with
`manage_messages` marked ephemeral for Admin/Editor accounts. Backend role checks
apply to commands, menus, replies and confirmation. Viewer accounts can respond
to attendance only when eligible, and cannot manage messages.

Use a bot administrator in the group for reliable command-origin ephemeral
messages. Inline-button actions pass Telegram's callback context. The menu is
edited in place; a native ForceReply prompt collects typed replacements, and an
administrative confirmation applies the change. These are ephemeral-only group
interactions. If Telegram loses the ephemeral message, restart the flow; there
is no private-chat fallback. Sessions expire after 15 minutes and restarting
invalidates earlier controls in that group.

Pre-attendance selects one or more member types. The roster is resolved and
frozen at send, includes matching unlinked members, and deduplicates identities.
Current workspace membership is checked when responding; removing a member
blocks new responses. Changing a type after send retains that occurrence's
roster and existing response. When arrival time is required, users enter HH:mm
through ephemeral ForceReply. Their update edits the original group card.
Supergroups/topics receive a Back to pre-attendance link; basic groups do not
have that supported original-message link. Telegram cannot force navigation.

For grouped messages, Attending first presents the group choices in the same
ephemeral flow. An optional arrival-time prompt follows. The group, status and
time are saved together only when the response is complete. Update response
shows the current choice and lets the attendee choose again. Not attending
clears the previous group and arrival time. New recurring occurrences have fresh
responses. Grouped cards put confirmed attendees under their chosen heading,
pending people under Awaiting response, and declined people under Not attending.

Console administrators can edit group definitions through Manage with the usual
occurrence/future/series scope and confirmation. Telegram management supports
renaming existing groups through buttons and native reply input. These edits keep
responses, times and the original Telegram message. Removing a group referenced
by a live response is rejected; attendees must change their choices first. Adding
groups to a previously ungrouped occurrence keeps existing attendance under
Awaiting group choice until those attendees select a group.

## Failure handling and first-version limits

Revision and synchronized revision are stored separately. Failed edits record
an error and remain queued for retries, subject to the existing daily worker and
provider backoff. Invalid payloads or removed destinations need an operator
correction; editing never posts a replacement. A failed explicit send may be
retried with Send now. An ambiguous timeout or crashed send becomes `unknown`
and is not automatically resent, because Telegram provides no idempotency key.
An operator must verify the group and reconcile the existing message ID in the
database before restoring that occurrence. No self-service reconciliation UI is
included yet.

Cadence/destination/audience changes use a new schedule/template in this first
version. Content and lifecycle changes on occurrences support recurring scopes.
There is no cancellation or expired-history browser yet; history remains in
Supabase. The message renderer enforces Telegram's 4096-character limit, so
large rosters must be split by member type or their template shortened.

## Local verification

No real bot or hosted database is required. `test/supabase/tests/run-local.sh` creates
a disposable PostgreSQL database with minimal Supabase auth fixtures and applies
these migrations before checking lifecycle/RLS behavior. API tests use fake
PostgREST and Telegram responses. See `test/supabase/tests/README.md` for the commands
and [the verification report](scheduled-messages-verification.md) for results
and the boundary between local tests and live integration.

For attendee-selected groups, run `test/scripts/scheduled-groups.integration.sh`.
It applies the migrations locally, checks the attendance lifecycle and scoped
edits, and passes actual database response rows through the production message
renderer. Telegram HTTP calls remain simulated. The isolated browser fixture
also covers group controls, save/reload, previews, recurring scopes and mobile
layout through `test/scripts/scheduled-groups.browser-test.js`.
