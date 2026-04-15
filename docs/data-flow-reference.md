# Data Flow Reference

This document explains how the current Supabase reads, writes, and runtime mappers map into the app-facing entities.

It separates:

- storage tables
- checked-in seed SQL
- frontend read models

## Source Map

| Domain | Current source | Key files | Notes |
| --- | --- | --- | --- |
| Requests | Supabase | `src/data/fetch-requests.ts`, `src/data/mutate-requests.ts`, `src/data/fetch-assignees.ts`, `src/data/map-request.ts` | Duty presets now come from code constants, not a table. |
| Auth | Supabase Auth + Supabase | `src/lib/auth-context.tsx`, `src/screens/auth/reset-password.tsx`, `src/screens/auth/password-recovery.tsx` | `users` reads now include `telegram_chat_id`, and password recovery completes through the dedicated recovery route. |
| Workspace | Supabase with default-workspace fallback | `src/data/current-workspace.ts`, `src/data/fetch-workspaces.ts`, `src/features/users/users-provider.tsx` | Runtime can fall back to the seeded `default-workspace` slug when memberships are missing. |
| Equipment | Supabase | `src/data/fetch-equipment.ts`, `src/data/mutate-equipment.ts` | Equipment rows remain normalized; booking-derived display fields are added in the mapper. |
| Broadcast | Supabase | `src/data/fetch-broadcast.ts`, `src/data/mutate-broadcast.ts` | Playlists still expose nested cues in memory, but the stored model is `playlists` plus `queue`. |
| Streams | Supabase + Edge Functions | `src/data/fetch-streams.ts`, `src/data/mutate-streams.ts`, `src/data/youtube-api.ts` | YouTube API calls go through Supabase Edge Functions (`supabase/functions/youtube-api/`). OAuth handled by `supabase/functions/youtube-oauth-callback/`. Local `streams` table is a cache of YouTube state. |
| Cue Sheet | Supabase + RPC helpers | `src/data/fetch-cue-sheet.ts`, `src/data/mutate-cue-sheet.ts`, `src/features/cue-sheet/cue-sheet-provider.tsx` | Storage is split between templates and runs; the runtime model still re-combines them behind a `kind` field. |
| Seed data | Checked-in SQL | `docs/phases/phase-11-seed-data.sql` | Replaces the deleted mock JSON and normalization scripts. |

## Current Live Code Changes

The codebase was updated in this pass to align the runtime layer with the documented schema:

- removed the mock JSON stores and normalization scripts for operational domains
- removed the `request_roles` Supabase dependency
- moved request duty presets into code constants
- removed `can_manage_assignees` from the role model and user-management permission checks
- added `telegramChatId` to the user profile read model
- made request `dueDate` required in the app model
- changed cue-sheet track color storage from raw CSS values to stable color keys plus a mapping utility
- added a workspace directory layer plus current-workspace caching and reset hooks around auth changes
- added the email-reset plus recovery-route password update flow

## Storage Model vs Read Model

### Storage model

This is the normalized schema in `schema-reference.md`.

Examples:

- `bookings.equipment_id`
- `bookings.booked_by`
- `queue.media_id`
- `tracks.color_id`
- `requests.workspace_id`

### Read model

This is the frontend object shape after joins and derivations.

Examples:

- `Booking.equipmentName`
- `Equipment.bookedBy`
- `QueueItem.mediaName`
- `Track.colorKey`
- `UserWithRole.workspaceIds`

## Equipment Example

### Preferred storage rows

`equipment`

- `id`
- `name`
- `serial_number`
- `category`
- `status`
- `location`
- `notes`
- `last_active_on`
- `thumbnail_url`

`bookings`

- `id`
- `equipment_id`
- `booked_by`
- `checked_out_at`
- `expected_return_at`
- `returned_at`
- `notes`
- `status`

### Runtime read model

```ts
type BookingListItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  bookedBy: string;
  checkedOutDate: string;
  expectedReturnAt: string;
  returnedDate: string | null;
  duration: string;
  notes: string;
  status: string;
};
```

Boundary:

- `equipmentName` is derived after fetch
- `duration` is derived after fetch

## Supabase Strategy

The main Supabase guidance relevant here is:

- foreign keys drive nested joins automatically
- `select()` supports aliasing
- generated database types should come from the actual schema
- workspace-scoped reads should resolve `workspace_id` from membership first, then fall back to the seeded `default-workspace`

Official references:

- https://supabase.com/docs/guides/database/joins-and-nesting
- https://supabase.com/docs/reference/javascript/select
- https://supabase.com/docs/guides/api/rest/generating-types
- https://supabase.com/docs/guides/database/extensions/uuid-ossp

### Recommended pattern

1. Keep the database normalized.
2. Fetch rows with joined relations.
3. Rename storage fields into app-friendly fields.
4. Derive convenience fields in the mapper.

## User Profile Mapping

Storage fields:

- `id`
- `name`
- `surname`
- `email`
- `telegram_chat_id`

Runtime fields:

- `id`
- `name`
- `surname`
- `email`
- `telegramChatId`

## Workspace Mapping

Storage fields:

- `workspaces.id`
- `workspaces.name`
- `workspaces.slug`
- `workspace_users.workspace_id`
- `workspace_users.user_id`

Runtime fields:

- `Workspace.id`
- `Workspace.name`
- `Workspace.slug`
- `UserWithRole.workspaceIds`

Current rollout rule:

1. top-level operational rows should eventually store `workspace_id`
2. user membership should come from `workspace_users`
3. screens should filter by workspace membership or parent record `workspaceId`
4. when membership rows are missing during bootstrap, the app can fall back to the seeded default workspace instead of blocking the UI

## Track Color Mapping

The cue-sheet track-color flow now follows the rebrand-safe pattern discussed in planning:

1. stored data carries a stable key
2. the app maps that key to an actual CSS color
3. a future rebrand changes the mapping in code, not the stored rows
4. the lookup table behind that mapping should stay shared as `colors`, not be tied to one feature

Current runtime example:

```ts
type Track = {
  id: string;
  name: string;
  colorKey: "blue" | "purple" | "red" | "green" | "orange";
  cues: Cue[];
};
```

## Seed Data Guidance

The operational sample data now lives in checked-in SQL rather than JSON:

- run `docs/phases/phase-11-seed-data.sql` after the schema phases
- keep ids and datetimes serialized as strings in the SQL literals
- keep the `default-workspace` row seeded so workspace-scoped queries have a safe fallback
- keep the mapping layer responsible for joins, aliases, and convenience fields instead of denormalizing the schema

That is why the schema doc and the value guide stay separate even though the app now reads directly from Supabase.
