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
| Workspace | Supabase membership + approval queue | `apps/console/src/data/current-workspace.ts`, `apps/console/src/data/fetch-workspaces.ts` | Pending accounts cannot resolve an accepted workspace until an owner or admin approves them. |
| Equipment | Supabase | `src/data/fetch-equipment.ts`, `src/data/mutate-equipment.ts` | Equipment rows remain normalized; booking-derived display fields are added in the mapper. |
| Streams | Supabase + MoC API | `apps/console/src/data/fetch-streams.ts`, `apps/console/src/data/mutate-streams.ts`, `apps/api/api/youtube/` | Provider calls and OAuth secrets stay behind the dedicated API app. Local `streams` is a cache of provider state. |
| Venues | Supabase | `apps/console/src/data/fetch-venues.ts`, `mutate-venues.ts`, `fetch-venue-bookings.ts`, `mutate-venue-bookings.ts`, `map-venue-booking.ts`; `apps/request/src/data/submit-venue-booking.ts`, `fetch-venue-availability.ts` | The console reads and cancels only; submissions come from MOC Request through `public_submit_venue_booking`. The booking status shown anywhere is derived by `deriveVenueBookingPhase`, never read from the row. |
| Structural seed | Checked-in SQL | `supabase/phase-01-schema.sql` | Seeds only the roles and default workspace required for bootstrap. |

## Current Live Code Changes

The codebase was updated in this pass to align the runtime layer with the documented schema:

- removed the mock JSON stores and normalization scripts for operational domains
- removed the `request_roles` Supabase dependency
- moved request duty presets into code constants
- removed `can_manage_assignees` from the role model and user-management permission checks
- added `telegramChatId` to the user profile read model
- made request `dueDate` required in the app model
- added a workspace directory layer plus current-workspace caching and reset hooks around auth changes
- added the email-reset plus recovery-route password update flow

## Storage Model vs Read Model

### Storage model

This is the normalized schema in `schema-reference.md`.

Examples:

- `bookings.equipment_id`
- `bookings.booked_by`
- `requests.workspace_id`

### Read model

This is the frontend object shape after joins and derivations.

Examples:

- `Booking.equipmentName`
- `Equipment.bookedBy`
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
4. when membership is pending, the app blocks member activity until an owner or admin approves the join request

## Seed Data Guidance

There is no operational sample-data migration. Structural bootstrap data lives
in `supabase/phase-01-schema.sql`; the current authorization and approval shape
is converged by the target-schema cleanup linked from `supabase/readme.md`.
Keep the mapping layer responsible for joins, aliases, and convenience fields
instead of denormalizing the schema.

That is why the schema doc and the value guide stay separate even though the app now reads directly from Supabase.
