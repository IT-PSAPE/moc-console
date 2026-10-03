# Scheduled messages: rollout and operation

The scheduled-message system reuses the notification delivery queue and daily
cron. Supabase migrations must be applied separately from deploying the code.

## Supabase migrations

These are PostgreSQL scripts for **Supabase**, not Telegram scripts. Review and
back up the target database under the existing migration process, then apply in
this order before deploying the API and Console code:

1. `supabase/migrations/20261003150000_workspace_member_types.sql`
2. `supabase/migrations/20261003160000_scheduled_messages.sql`
3. `supabase/migrations/20261003170000_scheduled_message_actions.sql`
4. `supabase/migrations/20261003180000_scheduled_message_composition.sql`

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

Use New message or Use template, fill in the variable values, and choose the
group and schedule. Message-specific values are copied into the schedule without
changing template defaults. Attendance options appear only for pre-attendance;
last recurring date appears only for repeating schedules. Preview and expiry/
timezone details use progressive disclosure.

The layout uses the declared `{{title}}`, `{{instructions}}`,
and, for pre-attendance, `{{expectedArrival}}` fields. Attendance lines and
controls are generated separately. A schedule copies the template, audience and
arrival requirement; later templates do not retroactively rewrite occurrences.

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
