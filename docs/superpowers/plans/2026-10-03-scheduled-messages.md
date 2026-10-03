# Scheduled Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is a draft for the requested architecture readback; settle the design's review decisions before dependent implementation. Do not delegate without user authorization or another applicable instruction.

**Goal:** Create one-off and recurring template messages with durable occurrences, expiry, authorized Telegram/Console administration, and pre-attendance rosters selected by member type.

**Architecture:** Add the scheduled-message domain within the existing notification system. Reuse the existing Telegram sender, linked destinations, identity mapping, template renderer/editor primitives, delivery queue, and webhook inbox; extend the worker for sends and durable edits.

**Tech Stack:** React 19.2, TypeScript, Vite, Tailwind CSS v4, Bun tests, Supabase/PostgreSQL, existing MOC API.

**Spec:** `docs/superpowers/specs/2026-10-03-scheduled-messages-design.md`

## Global Constraints

- Follow root AGENTS.md, including prior-art searches, shared UI primitives, composition, feature contexts, named functions, no `any`, and file size limits.
- Do not add libraries, create branches, push, or deploy as part of plan execution without the required explicit authorization.
- Preserve current notification behavior outside the scheduled-message domain.
- Admin/Editor management is workspace-scoped; Viewer participation does not imply administrative permission.
- Sent occurrences are editable through both Console and Telegram using one backend (confirmed by the user).
- Member types classify attendees; they never grant permissions. The default starts as Members, can be renamed, and always shows a Default badge.
- No AI interpreter or new Mini App. Persisted MOC data is authoritative.
- Do not apply migrations to production during implementation; use an isolated test database and a reviewed deployment plan.

## Review Focus

- Concurrent attendee and administrator edits must preserve the response and produce the latest rendering (Tasks 2 and 5).
- Time changes/DST must preserve stable occurrence identities and send once per recurrence position (Tasks 1 and 2).
- Expiry or role revocation between prompt and Apply must invalidate the pending session (Tasks 1 and 4).
- Accepted sends with lost responses must not be blindly retried; failed edits must never become replacement sends (Task 2).
- Closed topics, cross-workspace destinations, and forged or replayed callbacks must fail server-side (Tasks 1, 2, and 4).

## Task 1: Domain persistence, permissions, and occurrence rules

**Files:** Create `supabase/migrations/2026-10-03b-scheduled-messages.sql`, `apps/api/server/scheduled-messages/types.ts`, `lifecycle.ts`, `lifecycle.test.ts`, `store.ts`, and `store.test.ts` in that server folder. Create an isolated-database regression script `test/supabase/tests/scheduled-messages.sql` using the existing database build workflow. Add smaller migration files if separating functions makes review clearer.

**Interfaces:** `EditScope = "occurrence" | "future" | "series"`; store methods `listActive(actor, destination, now)`, `materialize(scheduleId, through)`, and `applyChange(actor, proposal, expectedRevision)`; proposal identifies one occurrence, one declared field/lifecycle change, and its scope. Actor resolves to a linked Telegram user or authenticated Console user plus workspace membership. Database transactions own scope resolution and atomic revision/edit-job creation.

- [ ] Write lifecycle tests: `now === expiresAt` excludes/rejects; a one-off has one identity and no scopes; rescheduling preserves identity; daily/weekday/weekly/monthly expansion honors timezone and ending rules.
- [ ] Run focused Bun tests and observe failures before adding behavior.
- [ ] Implement named template definitions, schedule revisions, occurrence snapshots/overrides, member-type audience selections, participant roster/response storage, and private sessions. Resolve current member types for upcoming previews and snapshot rosters at send. Reuse venue recurrence concepts only after removing venue slot/year limits. Store occurrence delivery references in the existing queue rather than copying Telegram transport state into an unrelated sender.
- [ ] Add database tests for Admin/Editor success, Viewer/unlinked/nonmember failure, cross-workspace reads/writes, expected-revision conflicts, all three scope boundaries, preserved unrelated overrides, and expired history remaining unchanged.
- [ ] Run focused tests and build an isolated database from tracked scripts; run the SQL regression script and require all assertions to pass.

## Task 2: Due sends, durable in-place edits, and expiry cleanup

**Files:** Modify `apps/api/server/notifications/delivery-store.ts`, its tests, `apps/api/server/notifications/outbox.ts`, and `apps/api/server/handlers/cron/notification-deliveries.ts`; create `apps/api/server/scheduled-messages/worker.ts` and `worker.test.ts`. Extend migration constraints/RPCs from Task 1 as necessary.

**Interfaces:** `processScheduledMessages(now: Date, limit: number): Promise<ScheduledRunResult>`; renderer from Task 3 supplies an occurrence's latest body/keyboard. Preserve the existing `enqueueDelivery` contract for current notifications; add optional scheduled-occurrence/revision and operation metadata. Edit operations target existing delivery message IDs.

- [ ] Write tests for one-off due send, recurring materialization, two concurrent workers, unsent edits before delivery, post-send edits, expiry before first send/retry, and expiry keyboard removal. Assert exactly one enqueue per occurrence/destination and no `sendMessage` after an edit failure.
- [ ] Run focused tests and observe failures.
- [ ] Implement locked due claims, send-time destination/expiry validation, fresh rendering, persisted IDs, atomic mutation/edit outbox, serialized newest-revision edits, provider retry handling, and explicit uncertain-send reconciliation. Keep current event-notification retry behavior unchanged.
- [ ] Test a response lost after accepted send, crash before ID persistence, an edit returning unchanged, failed synchronization, a late stale edit, and closed/removed destinations. Verify database revision and synchronized revision are distinct.
- [ ] Reuse the existing cron handler for materialization, due deliveries, edits, and cleanup. Keep the free-plan daily cron unchanged; document delivery precision and outage behavior.

## Task 3: Typed message fields and shared rendering

**Files:** Create `packages/notifications/src/scheduled-message-types.ts`, `scheduled-message-renderer.ts`, and `scheduled-message-renderer.test.ts`; modify `packages/notifications/src/index.ts`, `render-template.ts`, and template validation helpers only where required.

**Interfaces:** `ScheduledMessageType = "announcement" | "pre_attendance"`; registry definitions expose allowed field keys, labels, input types, validation, and generated tokens. `renderScheduledMessage(snapshot, responses, lifecycle)` returns body and keyboard using current rendering primitives. No JSX is returned by domain utilities.

- [ ] Write tests that each type exposes only declared fields, fixed/generated fields reject mutations, escaped replacements render safely, and attendee output is generated separately from administrator text.
- [ ] Run tests to observe failure, implement the registry and two types, then rerun.
- [ ] Test changing expected arrival while preserving individual arrival values and acknowledged revisions; expired output has no actionable keyboard.
- [ ] Confirm existing notification renderer/template tests still pass.

## Task 4: Authorized Telegram menu and native confirmed input

**Files:** Modify `apps/api/server/telegram.ts`, `telegram-callback-query.ts`, and `telegram-webhook-commands.ts`; create `apps/api/server/scheduled-messages/telegram-management.ts`, `telegram-input.ts`, and focused test files. Split sessions/menu/input modules by responsibility before exceeding size limits.

**Interfaces:** `handleScheduledManagementCommand(message): Promise<boolean>`, `handleScheduledManagementCallback(query): Promise<boolean>`, and `handleScheduledInput(message): Promise<boolean>` route only their namespaces. Sessions persist owner/workspace/origin, prompt/menu IDs, occurrence/revision, draft, stage, and expiry.

- [ ] Write command/callback/reply tests for authorized active lists, one-off direct editing, recurring scope choice, current-value prompt, Apply/Cancel, and updating one existing control menu.
- [ ] Run failing tests, extend the Telegram transport for current ephemeral parameters/edit methods, ForceReply, original-message return links, and scoped commands, then implement the state machine over the Task 1 store.
- [ ] Recheck role and lifecycle at every stage. Test Viewer/unlinked/removed users, ownership mismatch, forged cross-workspace callbacks, late replies, revoked permissions at Apply, optimistic conflicts, duplicate updates, and session expiry.
- [ ] Test unsupported ephemeral behavior using ephemeral restart behavior. Assert no administrative text-input prompt is sent publicly and no proposed input changes domain data before Apply.
- [ ] Configure command synchronization in existing link/group and role/membership update paths. Do not run command-registration writes against the live bot during local verification.

## Task 5: Participant attendance and private arrival input

**Files:** Create `apps/api/server/scheduled-messages/telegram-attendance.ts`, `attendance-store.ts`, and their tests; extend ephemeral input routing from Task 4 and registry rendering from Task 3. Add response mutation RPCs to the scheduled-message migrations.

**Interfaces:** Participant actions use their own namespace and `saveAttendance(actor, occurrenceId, status, arrivalTime, acknowledgedRevision)`. The sender identity determines the only response record that can change. Eligibility requires the snapshotted member-type roster plus current workspace membership.

- [ ] Write tests for Attending/Not attending/Update response, required/optional arrival time, ephemeral ForceReply, invalid time replacement, and original-message/topic return links.
- [ ] Run failing tests; implement eligibility, ephemeral session routing, response upserts, original rerender jobs, and current-response display.
- [ ] Test a Viewer eligible for attendance but denied management, a callback attempting another person's response, expired original/deep link/reply, and a concurrent administrative change.
- [ ] Assert administrator title/instruction/arrival changes preserve all participant responses; a later participant update retains the administrator's latest content. Test isolated response records for successive recurring occurrences.
- [ ] Test a member-type reassignment before send updates the eventual roster, a reassignment after send preserves that occurrence's response eligibility/history, an unlinked matching member remains listed, and a removed workspace member is rejected.

## Task 6: Console composition and complete verification

**Files:** Create `apps/console/src/data/scheduled-messages.ts`, `apps/console/src/features/scheduled-messages/` for hooks/context and necessary presentational children, and `apps/console/src/screens/account/settings/scheduled-messages/` for list/detail composition. Modify `use-settings-screen.ts`, Console routes, and Telegram settings composition for an operational messages surface accessible to Admin/Editor without exposing group registration/settings. Reuse `DateTimeFields`, `Section`, `Decision`, shared list controls, and rich-text editor primitives; generalize existing template-editor conversion only where actually shared.

**API placement:** Extend existing `apps/api/api/telegram/[action].ts` with authenticated `templates`, `schedules`, and `occurrences` handlers from the scheduled-message domain; preserve the deployment's consolidated function budget. Browser handlers use existing session/CORS/workspace helpers and the same store mutations as Telegram. Do not bypass the API for confirmed sent-message mutations.

- [ ] Build named template/preset editing and schedule composition: registered group/topic, declared fields, member-type audience, timezone, one-off/recurrence, expiry, preview, and upcoming/sent/expired history. Expose confirmed sent-occurrence edits through the same backend as Telegram.
- [ ] Verify Admin/Editor access and Viewer restrictions through server requests and Console navigation; integration controls remain restricted to their current permissions.
- [ ] Run the requested lifecycle matrix through isolated database + fake Telegram HTTP integration: one-off, recurring, before-send edit, after-send edit, single occurrence, future occurrences, entire series, exact expiry, unauthorized callers, and attendance before/after admin edits. Include failure/retry and concurrency cases from prior tasks.
- [ ] Run `bun run test:api`, `bun test test/packages/notifications`, API/Console builds and their lint commands; investigate failures in the changed area. Verify desktop/mobile flows and unsaved-change behavior in a browser.
- [ ] Check dead imports/exports, obsolete paths, component/hook/utility limits, and all references to replaced editor code. Update `apps/api/README.md` and schema verification for the new domain.
- [ ] Report tests actually run, operational timer requirements, and Telegram limits. Keep live bot, production migration, deployment, branch creation, push, and commit outside the authorized local implementation scope.

## Handoff

The design was reviewed and then implementation authorized by the user. Sent-edit and type-selected roster behavior are confirmed; review the classification-placement and roster-timing recommendations. Retain the existing daily timer and provide manual Send now; do not promise arbitrary send times. Implement in dependency order 0 → 1 → 3 → 2 → 4 → 5 → 6.

## Task 0: Workspace member types and limited classification management

**Files:** Create `supabase/migrations/2026-10-03a-workspace-member-types.sql`, `apps/console/src/data/member-types.ts`, `apps/console/src/features/users/use-member-types.ts`, and focused data tests. Extend `apps/console/src/data/fetch-users.ts`, `apps/console/src/features/users/users-provider.tsx`, the existing user card/list, and settings access/composition. Inspect the existing provider filename before changing it; use the actual feature context, never a parallel user store. Add `test/supabase/tests/workspace-member-types.sql` for database authorization/invariant assertions.

**Interfaces:** `MemberType = { id: string; workspaceId: string; name: string; isDefault: boolean }`; each workspace membership exposes `memberTypeId`. Services list/create/rename member types and assign membership types. Narrow server/RPC mutations authorize workspace Admin/Editor and cannot mutate `role_id` or membership approval state. These interfaces supply Task 1 roster resolution.

- [ ] Write tests for existing/new approved members receiving the default type, one immutable default identity per workspace, renaming Members while retaining its Default badge, and custom worker/volunteer type assignment.
- [ ] Run tests and observe failure; implement constraints/backfill/new-workspace and member-approval defaults plus narrow classification mutations.
- [ ] Test Editor classification management succeeds while Viewer, cross-workspace type assignment, default deletion/replacement, role mutation, and account approval through the same operation fail.
- [ ] Extend the existing users feature context and compose shared Select/Badge/list/dialog primitives. Provide Editor access to classification controls while retaining role-manager gates on security and approval controls; do not turn the whole privileged Members settings tab into an unrestricted surface.
- [ ] Test multiple audience types resolve a deduplicated roster including unlinked members, default-type rename preserves saved selections, and a member's type in one workspace does not change their type in another.
- [ ] Run isolated SQL assertions, relevant Bun tests, and Console build/lint. Remove replaced fields/handlers and retain one users-provider path.

## Approved implementation amendments

- Ephemeral-only management and participant input; no ephemeral restart behavior. Disappearing interactions restart.
- Keep the existing daily free-plan cron. Automatic calendar-date messages send when it runs; daily/weekly/monthly rules decide eligibility. Add Send now for manually triggered occurrences. No time-of-day guarantee and no native Telegram bot scheduling.
- Implementation is authorized; migration SQL is prepared locally for the user to apply to Supabase, not Telegram.
