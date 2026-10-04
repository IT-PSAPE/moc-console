# Attendee-selected Groups Implementation Plan

> **For agentic workers:** Use subagent-driven-development with Luna-class workers. Work in the current checkout; do not create branches, commit, push, or contact hosted services.

**Goal:** Let pre-attendance attendees select their own group for each occurrence, preserving existing attendance and lifecycle behaviour.

**Architecture:** Extend existing templates, schedule snapshots and occurrences with optional ordered `attendance_groups` JSON arrays. Responses store a nullable `group_id`. Existing materialization, revision checks, ephemeral sessions and delivery queue remain authoritative. Member types determine eligibility only, never assignment.

**Tech Stack:** React, TypeScript, existing shared UI, Bun, PostgreSQL and current Telegram client.

**Spec:** The user's approved grouping flow in this conversation: optional template-defined choices, attendee selection before time input, changing selections later, separate pending/declined sections, original-message edits, per-occurrence responses and expiry.

## Global Constraints

- No new libraries, branches, commits, remote writes or hosted Supabase/Telegram tests.
- Tests belong under root `test/`; follow AGENTS.md separation and reuse rules.
- `ScheduledAttendanceGroup = { id: string; label: string }`; stable UUID IDs, trimmed case-insensitively unique labels of 1–40 chars, 0 or 2–8 groups, pre_attendance only.
- API template payload uses `attendanceGroups`; storage uses `attendance_groups`. Existing templates default to `[]`.
- `ScheduledRenderInput.attendanceGroups?`, `ScheduledResponse.groupId?`; shared contracts add optional `attendance_groups` for backwards-compatible typed fixtures.
- Edit groups through existing `change_scheduled_occurrence` field `attendanceGroups`, value JSON array; respect occurrence/future/series scopes. Reject deleting a group referenced by affected live responses; preserve IDs on rename/reorder.
- New attendee RPC parameter `p_group text DEFAULT NULL`; replace old overload, revoke public/anon/authenticated and grant service_role.
- No dynamic date or recurrence redesign in this grouping change; existing date conversion stays intact.

## Review Focus

- Forged group IDs, stale controls, another person's session and expired messages cannot mutate a response.
- Selecting a group alone does not save a partial response; group/status/time commit atomically.
- Administrative edits preserve response IDs, selected group, times and original Telegram message ID.
- Removing a used group fails atomically across a recurring edit; new occurrences have fresh pending responses.
- Ungrouped messages retain current text/actions; empty groups remain visible, HTML labels/names are escaped.

### Task 1: Shared types and rendering (parent)

- [x] Add failing tests under test/packages/notifications for grouped sections, escaping and ungrouped compatibility.
- [x] Add `scheduled-attendance-groups.ts` with exported type and `validateScheduledAttendanceGroups(type, value): ScheduledAttendanceGroup[]`.
- [x] Extend contracts and shared renderer with grouped attending sections plus Awaiting response / Not attending. Awaiting entries must not be assigned by member type.
- [x] Run package tests and build API before consumers rely on notifications dist.

### Task 2: Database lifecycle (SQL worker)

Files: new `supabase/migrations/2026-10-04b-scheduled-attendance-groups.sql`, manifest/readme, test/supabase/tests/scheduled-attendance-groups.sql, run-local.sh, fresh-build test.

- [x] Write SQL tests that fail before applying the new migration; run isolated local PostgreSQL.
- [x] Add columns and SQL validation. Extend template save/schedule snapshot/materialization and group-aware scoped admin editing without altering existing dates or permissions.
- [x] Extend attendance response RPC atomically: require a valid group when attending in grouped occurrence; clear group/time on not_attending; reject group on ungrouped message.
- [x] Test one-off/recurring, edit scopes, expiry, unauthorized users, used-group removal, and response/message-ID retention. Register migration and document application.

### Task 3: Telegram flow (Telegram worker)

Files: apps/api/server/scheduled-messages/{types,store,attendance-flow,telegram-flow,delivery,admin-flow}.ts, associated tests.

- [x] Write/run failing grouped callback tests.
- [x] When attending a grouped message, show ephemeral group choices before optional arrival prompt. Session stores `groupId`; callback action `group:<index>` identifies stored stable choices. Pass callback argument through attendance handler.
- [x] Recheck occurrence revision, eligibility, group validity and session ownership at each step; no data write until complete. Update flow shows current group; later replies use selected group.
- [x] Pass group IDs and definitions through delivery rendering, preserving edit-in-place.
- [x] Expose group rename through deterministic admin buttons/native input, confirmation and existing scope choices. Do not ask users to type JSON. Template/Console controls handle group add/removal.
- [x] Run API tests including ungrouped regressions; await parent build if dist is stale.

### Task 4: Console template and occurrence controls (UI worker)

Files: scheduled template hook/form, messages hook/occurrence editor, preview helper, feature group controls/hook if required, test/scripts/scheduled-groups.browser-test.js.

- [x] Reuse existing Section, FormField, Input and Button controls. Prior-art search required before creating components.
- [x] Template has optional Attendance groups: add group choices, label editing, add/remove; 2–8 groups when enabled. Preserve stable IDs; save `attendanceGroups`, load row `attendance_groups`.
- [x] Preview includes empty group headings and eligible pending roster below Awaiting response; never assigns users to groups.
- [x] Schedule preview copies template group settings. Occurrence editor exposes group editing with human-readable confirmation and scopes. Do not show JSON UI.
- [x] Verify fixture save/reload, announcement switch, preview, delete/add stable IDs, mobile/keyboard, and original ungrouped template management regression.

### Task 5: Integration and verification (parent + review worker)

- [x] Review spec and quality across all diffs; resolve findings.
- [x] Run full `bun test ./test`, workspace lint, API and Console builds, isolated SQL lifecycle/concurrency suite and production UI fixture browser checks.
- [x] Report migration path, actual behaviour and limitations; no hosted migration or push.
