# Schema Reference

This document describes the data schema currently implied by the codebase.

It is an inferred schema, not a database migration export. There is no checked-in SQL or migration folder in this repository, so the source of truth for this document is:

- `src/types/**`
- `src/data/**`
- `src/lib/auth-context.tsx`
- `src/data/mock/*.json`

## Scope And Caveats

- Requests and request assignments are backed by Supabase tables.
- User profile and role lookups are backed by Supabase tables plus Supabase Auth.
- Equipment, bookings, broadcast media, playlists, broadcast cues, cue-sheet events, cue-sheet checklists, and cue-sheet timeline tracks are currently mock-backed.
- Several fields are optional in the app model but normalized to `null` when written to Supabase.
- Some storage conventions are domain-specific:
  - Request dates behave like ISO datetime strings.
  - Equipment and broadcast dates currently behave like `YYYY-MM-DD` date strings.
  - Cue-sheet event and checklist dates currently use ISO datetime strings, while cue timing is stored as minute offsets.

## Domain Summary

| Domain | Primary model(s) | Backing source |
| --- | --- | --- |
| Requests | `Request`, `RequestAssignee`, request duty roles | Supabase |
| Users and roles | `User`, `Role` | Supabase + Supabase Auth |
| Equipment | `Equipment`, `Booking` | Mock JSON |
| Broadcast | `Playlist`, `Cue`, `MediaItem`, `SlideImage` | Mock JSON |
| Cue Sheet | `CueSheetEvent`, `Checklist`, `Track`, `Cue` | Mock JSON |

## Requests

### App model: `Request`

Source:
- `src/types/requests/request.ts`
- `src/data/map-request.ts`

| Field | Type | Required in app object | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Free-form string identifier | Persisted directly to `requests.id`. |
| `title` | `string` | Yes | No | Non-empty text expected | Primary request label. |
| `priority` | `"low" \| "medium" \| "high" \| "urgent"` | Yes | No | Enum | See `src/types/requests/priority.ts`. |
| `status` | `"not_started" \| "in_progress" \| "completed" \| "archived"` | Yes | No | Enum | See `src/types/requests/status.ts`. |
| `category` | `"video_production" \| "video_shooting" \| "graphic_design" \| "event" \| "education"` | Yes | No | Enum | See `src/types/requests/category.ts`. |
| `createdAt` | `string` | Yes | No | ISO datetime string expected | Mapped to `created_at`. |
| `dueDate` | `string \| null` | Yes | Yes | ISO datetime string or `null` | Mapped to `due_date`. |
| `who` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `what` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `when` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `where` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `why` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `how` | `string` | Yes | No | Free text | Part of the 5W1H block. |
| `notes` | `string \| undefined` | No | App: omitted, DB: `null` | Free text | Written as `null` when absent. |
| `flow` | `string \| undefined` | No | App: omitted, DB: `null` | Free text | Written as `null` when absent. |
| `content` | `string \| undefined` | No | App: omitted, DB: `null` | Free text | Written as `null` when absent. |

### Persistence model: `requests` table

Inferred from `src/data/fetch-requests.ts`, `src/data/mutate-requests.ts`, and `src/data/map-request.ts`.

| Column | Type in app after mapping | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | `string` | No | Primary identifier in app. |
| `title` | `string` | No | Request title. |
| `priority` | `Priority` | No | Stored in snake_case-free enum form. |
| `status` | `Status` | No | `archived` is stored, not soft-deleted elsewhere. |
| `category` | `Category` | No | Request type/category. |
| `created_at` | `string` | No | Read into `createdAt`. |
| `due_date` | `string \| null` | Yes | Read into `dueDate`. |
| `who` | `string` | No | 5W1H field. |
| `what` | `string` | No | 5W1H field. |
| `when` | `string` | No | 5W1H field. |
| `where` | `string` | No | 5W1H field. |
| `why` | `string` | No | 5W1H field. |
| `how` | `string` | No | 5W1H field. |
| `notes` | `string \| null` | Yes | Mapped to optional `notes`. |
| `flow` | `string \| null` | Yes | Mapped to optional `flow`. |
| `content` | `string \| null` | Yes | Mapped to optional `content`. |

### `request_assignees` join table

Source:
- `src/types/requests/assignee.ts`
- `src/data/fetch-assignees.ts`
- `src/data/mutate-requests.ts`

| Column / field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `request_id` / `requestId` | `string` | No | Foreign key to `requests.id`. |
| `user_id` / `userId` | `string` | No | Foreign key to `users.id`. |
| `duty` | `string` | No | Duty or assignment label. |

### Resolved assignee view

The UI also uses a denormalized read shape:

| Field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | `string` | No | From joined `users` row. |
| `name` | `string` | No | From joined `users` row. |
| `surname` | `string` | No | From joined `users` row. |
| `email` | `string` | No | From joined `users` row. |
| `duty` | `string` | No | From `request_assignees.duty`. |

### `request_roles` lookup table

Inferred from `src/data/fetch-roles.ts`.

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `name` | `string` | No | Duty-role preset used when assigning people to requests. |

## Users And Roles

### `users` profile table

Source:
- `src/types/requests/assignee.ts`
- `src/data/fetch-assignees.ts`
- `src/lib/auth-context.tsx`

| Field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | `string` | No | Queried by `auth.user.id`, so this is expected to align with Supabase Auth user id. |
| `name` | `string` | No | First/given name. |
| `surname` | `string` | No | Last/family name. |
| `email` | `string` | No | User email address. |

### `roles` table

Source:
- `src/types/requests/assignee.ts`
- `src/lib/auth-context.tsx`

| Field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | `string` | No | Role identifier. |
| `name` | `string` | No | Human-readable role name. |
| `can_create` | `boolean` | No | Permission flag. |
| `can_read` | `boolean` | No | Permission flag. |
| `can_update` | `boolean` | No | Permission flag. |
| `can_delete` | `boolean` | No | Permission flag. |
| `can_manage_roles` | `boolean` | No | Permission flag. |
| `can_manage_assignees` | `boolean` | No | Permission flag. |

### `user_roles` join table

Inferred from `src/lib/auth-context.tsx`.

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `user_id` | `string` | No | Links to `users.id`. |
| `roles(...)` | nested role object | No | Current code expects one role per user via `.single()`. |

### Supabase Auth user

The app also depends on Supabase Auth session data:

| Field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `session` | `Session \| null` | Yes | Auth session from `@supabase/supabase-js`. |
| `user` | `Auth User \| null` | Yes | Authenticated Supabase user. |

This is separate from the app-level `users` profile row.

## Equipment

Source:
- `src/types/equipment/**`
- `src/data/mock/equipment.json`
- `src/data/mock/bookings.json`

### `Equipment`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefix `eq-` | Inventory identifier. |
| `name` | `string` | Yes | No | Free text | Human-readable equipment name. |
| `serialNumber` | `string` | Yes | No | Free text | Unique-looking asset identifier in mock data. |
| `category` | `"camera" \| "lens" \| "lighting" \| "audio" \| "support" \| "monitor" \| "cable" \| "accessory"` | Yes | No | Enum | Equipment category. |
| `status` | `"available" \| "booked" \| "booked_out" \| "maintenance"` | Yes | No | Enum | Availability/workflow state. |
| `location` | `string` | Yes | No | Free text | Current storage or field location. |
| `notes` | `string` | Yes | No | Free text, often empty string | Damage/maintenance notes or blank string. |
| `lastActiveDate` | `string` | Yes | No | `YYYY-MM-DD` in current data | Date-like string. |
| `bookedBy` | `string \| null` | Yes | Yes | Person name or `null` | Occupancy context. |
| `thumbnail` | `string \| null` | Yes | Yes | URL or `null` | Optional preview image. |

### `Booking`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefix `bk-` | Booking identifier. |
| `equipmentId` | `string` | Yes | No | References `Equipment.id` | Foreign key in app model. |
| `equipmentName` | `string` | Yes | No | Free text | Denormalized display field. |
| `bookedBy` | `string` | Yes | No | Person name | Current schema uses plain string, not user id. |
| `checkedOutDate` | `string` | Yes | No | `YYYY-MM-DD` in current data | Booking start/check-out date. |
| `returnedDate` | `string \| null` | Yes | Yes | `YYYY-MM-DD` or `null` | Null while still active. |
| `duration` | `string` | Yes | No | Human-readable text like `3 days` | Not numeric. |
| `notes` | `string` | Yes | No | Free text, sometimes empty string | Booking note field. |
| `status` | `"booked" \| "checked_out" \| "returned"` | Yes | No | Enum | Booking workflow state. |

## Broadcast

Source:
- `src/types/broadcast/**`
- `src/data/mock/broadcasts.json`
- `src/data/mock/media.json`

### `Playlist`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefixes `bc-`, `pl-new-` | Playlist identifier. |
| `name` | `string` | Yes | No | Free text | Playlist name. |
| `description` | `string` | Yes | No | Free text, may be empty string | Playlist summary. |
| `status` | `"draft" \| "active"` | Yes | No | Enum | Broadcast readiness state. |
| `createdAt` | `string` | Yes | No | `YYYY-MM-DD` in current data | Date-like string. |
| `cues` | `Cue[]` | Yes | No | Array | Ordered cue list. |

### `Cue`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefix `cue-` | Cue identifier. |
| `mediaItemId` | `string` | Yes | No | References `MediaItem.id` | Linked media asset id. |
| `mediaItemName` | `string` | Yes | No | Free text | Denormalized media name. |
| `mediaItemType` | `"image" \| "audio" \| "video" \| "slide"` | Yes | No | Enum | Denormalized media type. |
| `order` | `number` | Yes | No | 1-based integer expected | Queue position. |
| `durationOverride` | `number \| null` | Yes | Yes | Seconds or `null` | `null` means use media default duration. |

### `MediaItem`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefix `media-` | Media identifier. |
| `name` | `string` | Yes | No | Free text | Media label. |
| `type` | `"image" \| "audio" \| "video" \| "slide"` | Yes | No | Enum | Media kind. |
| `url` | `string` | Yes | No | URL or empty string for slide items in current mock data | Primary asset URL. |
| `thumbnail` | `string \| null` | Yes | Yes | URL or `null` | Optional preview image. |
| `duration` | `number \| null` | Yes | Yes | Seconds or `null` | Null for images and slides in current data. |
| `createdAt` | `string` | Yes | No | `YYYY-MM-DD` in current data | Date-like string. |
| `slides` | `SlideImage[] \| null` | Yes | Yes | Array or `null` | Used by slide decks only. |
| `audioUrl` | `string \| null` | Yes | Yes | URL or `null` | Optional audio overlay, currently used by slide items only. |

### `SlideImage`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | Example prefix `slide-` | Slide identifier. |
| `url` | `string` | Yes | No | Image URL | Slide image asset. |
| `duration` | `number` | Yes | No | Seconds | Per-slide duration. |

## Cue Sheet

Source:
- `src/types/cue-sheet/**`
- `src/data/mock/cue-sheet-events.json`
- `src/data/mock/cue-sheet-checklists.json`
- `src/data/mock/cue-sheet-tracks.json`

### `CueSheetEvent`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Event template identifier. |
| `title` | `string` | Yes | No | Free text | Primary event label and breadcrumb title. |
| `description` | `string` | Yes | No | Free text, may be empty string | Event context shown in lists. |
| `duration` | `number` | Yes | No | Minutes | Total timeline duration for the event. |
| `createdAt` | `string` | Yes | No | ISO datetime string in current data | Creation timestamp. |
| `updatedAt` | `string` | Yes | No | ISO datetime string in current data | Last update timestamp. |

### `Checklist`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Checklist identifier. |
| `name` | `string` | Yes | No | Free text | Primary checklist label and breadcrumb title. |
| `description` | `string` | Yes | No | Free text, may be empty string | Checklist context shown in lists and details. |
| `items` | `ChecklistItem[]` | Yes | No | Array | Top-level checklist items not assigned to a section. |
| `sections` | `ChecklistSection[]` | Yes | No | Array | Grouped checklist item sections. |
| `createdAt` | `string` | Yes | No | ISO datetime string in current data | Creation timestamp. |
| `updatedAt` | `string` | Yes | No | ISO datetime string in current data | Last update timestamp. |

### `ChecklistItem`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Checklist item identifier. |
| `label` | `string` | Yes | No | Free text | Visible task text. |
| `checked` | `boolean` | Yes | No | `true` or `false` | Completion state. |

### `ChecklistSection`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Section identifier. |
| `name` | `string` | Yes | No | Free text | Visible section heading. |
| `items` | `ChecklistItem[]` | Yes | No | Array | Items inside the section. |

### Cue-sheet `Track`

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Timeline track identifier. |
| `name` | `string` | Yes | No | Free text | Track lane label, such as `Audio` or `Visuals`. |
| `color` | `string` | Yes | No | CSS color string | Track and cue visual color. |
| `cues` | `Cue[]` | Yes | No | Array | Timeline cues rendered within this track. |

### Cue-sheet `Cue`

This is separate from broadcast `Cue`.

| Field | Type | Required | Nullable | Allowed values / format | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | Yes | No | UUID-like string in current mock data | Timeline cue identifier. |
| `label` | `string` | Yes | No | Free text | Visible cue label. |
| `startMin` | `number` | Yes | No | Minutes from event start | Timeline start offset. |
| `durationMin` | `number` | Yes | No | Minutes | Cue duration. |
| `type` | `"performance" \| "technical" \| "equipment" \| "announcement" \| "transition"` | Yes | No | Enum | See `src/types/cue-sheet/timeline.ts`. |
| `notes` | `string \| undefined` | No | App: omitted | Free text | Optional implementation or operator note. |

## Relationships

- `request_assignees.request_id` points to `requests.id`.
- `request_assignees.user_id` points to `users.id`.
- `user_roles.user_id` points to `users.id`.
- `user_roles` joins to `roles`.
- `Booking.equipmentId` points to `Equipment.id`.
- `Cue.mediaItemId` points to `MediaItem.id`.
- `Playlist.cues` is an embedded ordered list, not a separate persisted table in the current mock-backed implementation.
- Cue-sheet tracks are keyed by `CueSheetEvent.id` in `src/data/mock/cue-sheet-tracks.json`.
- `Checklist.sections.items` are embedded under each checklist, not normalized into separate persisted tables in the current mock-backed implementation.

## Enumerations

### Request enums

| Enum | Values |
| --- | --- |
| `Status` | `not_started`, `in_progress`, `completed`, `archived` |
| `Priority` | `low`, `medium`, `high`, `urgent` |
| `Category` | `video_production`, `video_shooting`, `graphic_design`, `event`, `education` |

### Equipment enums

| Enum | Values |
| --- | --- |
| `EquipmentStatus` | `available`, `booked`, `booked_out`, `maintenance` |
| `EquipmentCategory` | `camera`, `lens`, `lighting`, `audio`, `support`, `monitor`, `cable`, `accessory` |
| `BookingStatus` | `booked`, `checked_out`, `returned` |

### Broadcast enums

| Enum | Values |
| --- | --- |
| `PlaylistStatus` | `draft`, `active` |
| `MediaType` | `image`, `audio`, `video`, `slide` |

### Cue-sheet enums

| Enum | Values |
| --- | --- |
| `CueType` | `performance`, `technical`, `equipment`, `announcement`, `transition` |
