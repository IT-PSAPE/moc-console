# Scheduled-message verification — 3 October 2026

Testing used Luna agents for SQL lifecycle checks, Telegram flow tests, browser
checks and a read-only implementation review. Verification used an isolated
worktree. During these checks, no hosted Supabase database, live Telegram group
or deployed Vercel project was modified.

The frontend refinement used the Impeccable skill to follow the existing Console
patterns, then a bounded desktop/mobile review and confirmation pass with Luna.

## Results

- Pre-push repository suite: **485 passed, 0 failed**, across 86 files.
- Pre-push builds for every workspace: passed.
- API: **302 passed, 0 failed**, across 49 files (`bun test test/apps/api` from the repository root).
- Shared notifications: **60 passed, 0 failed**, across 6 files (`bun test test/packages/notifications` from the repository root).
- TypeScript builds for notifications, API and Console: passed.
- Console production build: passed. Vite reported a plugin timing warning.
- Targeted ESLint for the changed Console files and new API files: passed.
- `git diff --check`: passed.
- All four migrations, lifecycle assertions and two-session concurrency checks:
  passed in a disposable PostgreSQL 16 cluster using a private local Unix socket.

The SQL runner applies the actual new migrations to minimal Supabase-shaped
fixtures and uses real `authenticated` and `service_role` database roles. It
checks default member-type backfills and rename/assignment permissions; one-off
and recurring materialization; before/after-send edits; occurrence/future/series
scopes; future edits beyond the materialization window; send-date deferral;
manual delivery; expiry rejection; frozen rosters; attendance retention and
updates; Telegram message identity; revisions; and interrupted-send recovery.
Concurrent sessions verify one queued send, one revision winner, one delivery
lease winner and one current ephemeral session per owner/chat.

The composition migration was tested against both database versions: the first
three migrations failed the new workspace-bound template-update assertion; all
four passed. The additional assertions cover template identity, schedule-specific
variable overrides, read-only fields, and preserving existing schedule and
occurrence snapshots when a template changes.

Telegram tests use fake PostgREST and Telegram transport responses. They cover
ephemeral method payloads, owner/prompt binding, session restart invalidation,
permission rejection, expiry, confirmation, recurring scopes, attendance input,
editing the original message and send failures. Missing credentials are treated
as a known preflight failure; uncertain transport failures stop automatic resend.

Browser checks use the real Console UI with local API/Supabase mocks. They cover
pre-attendance template fields and audience selection; once/weekly schedules and
topics; one-off scope omission; recurring future edits; Send now confirmation
and visible errors; member-type create/rename/assignment; assignment RPC argument
matching; and mobile layout at 390 × 844 without document-level overflow.

The updated sidebar and routed composers were checked with a fresh local fixture:
Viewer navigation rejection; loading and failed-load recovery without false empty
states; template creation and in-place editing through the existing unsaved-change
guard; rich-source/default preservation; variable prefills and a schedule-specific
title override; weekly-only last-date disclosure; review confirmation; and keeping
the list visible after a send failure. Corrected append-only fixture logging
confirmed exactly one create and one update using the same template ID. The old
notification template's Editor/Source switch was checked without writing to it.
Mobile Active, template and message setup pages had no horizontal overflow; the
final Active screenshot also confirms readable dates and actions below details.
The occurrence-scope modal was not repeated in this refinement pass; it retains
the earlier lifecycle and browser coverage above.

## Boundaries

These checks do not establish that a particular live bot has the required group
rights, that every Telegram client preserves ephemeral flows, or that the hosted
database matches the local fixture. Apply the migrations through the project's
normal Supabase process, deploy the code, then verify one controlled message in
the intended group before enabling production schedules.

Run the SQL checks with the command in [the SQL test README](../test/supabase/tests/README.md).
Migration order and operational limits are in [the rollout guide](scheduled-messages-rollout.md).
