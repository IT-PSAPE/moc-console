# Schema Reference

This document defines the intended relational schema for the project.

It is the database view only:

- table names
- column names
- Postgres types
- defaults
- nullable and unique constraints
- foreign-key relationships

It does not describe denormalized frontend entities. Those live in [value-guide.md](./value-guide.md). Runtime mapping and fetch-time shaping live in [data-flow-reference.md](./data-flow-reference.md).

## Tracking Source

- Storage target: Supabase Postgres
- Naming convention: `snake_case`
- ID strategy: `uuid` in storage, string in JSON/API responses
- Current runtime status: auth, workspaces, requests, equipment, bookings and stream flows read and write Supabase directly; the remaining gap is mostly between normalized storage and denormalized runtime objects

## Table Overview

| Table | Purpose | Primary key | Key relations |
| --- | --- | --- | --- |
| `users` | App user profiles aligned to Supabase Auth | `id` | `id -> auth.users.id` |
| `workspaces` | Workspace containers for operational data | `id` | Referenced by `workspace_users.workspace_id` and workspace-scoped domain tables |
| `workspace_users` | Membership join between users and workspaces | `id` | `workspace_id -> workspaces.id`, `user_id -> users.id` |
| `roles` | Role definitions and permissions | `id` | Referenced by `user_roles.role_id` |
| `user_roles` | Role assignment per user | `user_id` | `user_id -> users.id`, `role_id -> roles.id` |
| `requests` | Work requests | `id` | `workspace_id -> workspaces.id`; referenced by `request_assignees.request_id` |
| `request_assignees` | Request-to-user assignments | `id` | `request_id -> requests.id`, `user_id -> users.id` |
| `equipment` | Inventory records | `id` | `workspace_id -> workspaces.id`; referenced by `bookings.equipment_id` |
| `bookings` | Equipment reservations and checkout rows | `id` | `workspace_id -> workspaces.id`, `equipment_id -> equipment.id` |
| `youtube_connections` | Workspace-level YouTube OAuth credentials | `id` | `workspace_id -> workspaces.id`, `connected_by -> users.id` |
| `streams` | YouTube live stream records | `id` | `workspace_id -> workspaces.id`, `created_by -> users.id` |
| `colors` | Stable semantic color keys shared across domains | `id` | Referenced by workspace-scoped domain tables |

## Enum Domains

| Name | Allowed values |
| --- | --- |
| `request_priority` | `low`, `medium`, `high`, `urgent` |
| `request_status` | `not_started`, `in_progress`, `completed`, `archived` |
| `request_category` | `video_production`, `video_shooting`, `graphic_design`, `event`, `education` |
| `equipment_category` | `camera`, `lens`, `lighting`, `audio`, `support`, `monitor`, `cable`, `accessory` |
| `equipment_status` | `available`, `booked`, `booked_out`, `maintenance` |
| `booking_status` | `booked`, `checked_out`, `returned` |
| `stream_status` | `created`, `ready`, `live`, `complete` |

## Auth

### `users`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | None | No | Yes | Primary key. Should match `auth.users.id`. |
| `name` | `text` | None | No | No | Given name. |
| `surname` | `text` | None | No | No | Family name. |
| `email` | `text` | None | No | Yes | Login/profile email. |
| `telegram_chat_id` | `text` | `null` | Yes | Yes | Telegram chat identifier for future bot/integration flows. |

### `workspaces`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `name` | `text` | None | No | Yes | Human-readable workspace name. |
| `slug` | `text` | None | No | Yes | URL-safe workspace key. |
| `description` | `text` | `null` | Yes | No | Optional workspace summary. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |

Bootstrap requirement:

- Seed one workspace with slug `default-workspace`. The runtime uses it as the safe fallback when a signed-in user has no `workspace_users` row yet or when requests are made before membership resolution completes.

### `workspace_users`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `user_id` | `uuid` | None | No | No | Foreign key to `users.id`. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |

Additional constraint:

- Add `unique (workspace_id, user_id)`.

### `roles`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `name` | `text` | None | No | Yes | Human-readable role name. |
| `can_create` | `boolean` | `false` | No | No | Permission flag. |
| `can_read` | `boolean` | `false` | No | No | Permission flag. |
| `can_update` | `boolean` | `false` | No | No | Permission flag. |
| `can_delete` | `boolean` | `false` | No | No | Permission flag. |
| `can_manage_roles` | `boolean` | `false` | No | No | Admin role-management flag. |

### `user_roles`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `user_id` | `uuid` | None | No | Yes | Primary key and foreign key to `users.id`. |
| `role_id` | `uuid` | None | No | No | Foreign key to `roles.id`. |

## Requests

### `requests`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `title` | `text` | None | No | No | Request title. |
| `priority` | `request_priority` | None | No | No | Enum-backed priority. |
| `status` | `request_status` | `not_started` | No | No | Enum-backed request state. |
| `category` | `request_category` | None | No | No | Request category. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |
| `requested_by` | `text` | None | No | No | Requester name/details as free text. |
| `due_date` | `timestamptz` | None | No | No | Required due date. No default `now()`. |
| `who` | `text` | None | No | No | 5W1H field. |
| `what` | `text` | None | No | No | 5W1H field. |
| `when_text` | `text` | None | No | No | Narrative timing field. |
| `where_text` | `text` | None | No | No | Narrative location/channel field. |
| `why` | `text` | None | No | No | 5W1H field. |
| `how` | `text` | None | No | No | 5W1H field. |
| `notes` | `text` | `null` | Yes | No | Optional supporting notes. |
| `flow` | `text` | `null` | Yes | No | Optional sequence notes. |
| `content` | `text` | `null` | Yes | No | Optional long-form content. |

### `request_assignees`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `request_id` | `uuid` | None | No | No | Foreign key to `requests.id`. |
| `user_id` | `uuid` | None | No | No | Foreign key to `users.id`. |
| `duty` | `text` | None | No | No | Per-request duty label. |

Additional constraint:

- Add `unique (request_id, user_id, duty)`.

Important note:

- There is no `request_roles` or `request_duties` table in this schema.
- Duty presets should live in code as defaults, not as a relational table.

## Equipment

### `equipment`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `name` | `text` | None | No | No | Equipment display name. |
| `serial_number` | `text` | None | No | Yes | Physical asset identifier. |
| `category` | `equipment_category` | None | No | No | Equipment category. |
| `status` | `equipment_status` | `available` | No | No | Availability state. |
| `location` | `text` | None | No | No | Physical or operational location. |
| `notes` | `text` | `null` | Yes | No | Repair/handling notes. |
| `last_active_on` | `date` | `null` | Yes | No | Last known active date. |
| `thumbnail_url` | `text` | `null` | Yes | No | Optional preview image URL. |

Important normalization rule:

- `equipment` does not store `booked_by`.

### `bookings`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `equipment_id` | `uuid` | None | No | No | Foreign key to `equipment.id`. |
| `booked_by` | `text` | None | No | No | Free-text name of the person the booking is for. Not necessarily a logged-in user. |
| `checked_out_at` | `timestamptz` | None | No | No | Start/checkout timestamp. |
| `expected_return_at` | `timestamptz` | None | No | No | Due-back timestamp. |
| `returned_at` | `timestamptz` | `null` | Yes | No | Null until the item is returned. |
| `notes` | `text` | `null` | Yes | No | Booking notes. |
| `status` | `booking_status` | `booked` | No | No | Booking lifecycle state. |

Important normalization rules:

- `bookings` stores `equipment_id`, not `equipment_name`.
- `bookings` stores `booked_by` as text, not a user id.
- The human-readable duration shown in the UI should be derived, not stored.

## Streams

### `youtube_connections`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | Yes | Foreign key to `workspaces.id`. One connection per workspace. |
| `channel_id` | `text` | None | No | No | YouTube channel ID. |
| `channel_title` | `text` | None | No | No | YouTube channel display name. |
| `access_token` | `text` | None | No | No | Google OAuth access token. |
| `refresh_token` | `text` | None | No | No | Google OAuth refresh token. |
| `token_expires_at` | `timestamptz` | None | No | No | Access token expiry timestamp. |
| `connected_by` | `uuid` | None | No | No | Foreign key to `users.id`. Admin who connected the account. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |

Important notes:

- One YouTube connection per workspace, enforced by `unique (workspace_id)`.
- Tokens are managed server-side via Supabase Edge Functions. The client never sees the raw tokens.
- Only admins (`can_manage_roles`) can insert, update, or delete connections.

### `streams`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `youtube_broadcast_id` | `text` | None | No | No | YouTube liveBroadcast ID. |
| `youtube_stream_id` | `text` | None | No | No | YouTube liveStream ID. |
| `title` | `text` | None | No | No | Stream title. |
| `description` | `text` | `''` | No | No | Stream description. |
| `thumbnail_url` | `text` | `null` | Yes | No | Optional thumbnail URL. |
| `privacy_status` | `text` | `'unlisted'` | No | No | YouTube privacy: `public`, `private`, or `unlisted`. |
| `is_for_kids` | `boolean` | `false` | No | No | YouTube made-for-kids designation. |
| `scheduled_start_time` | `timestamptz` | `null` | Yes | No | Scheduled broadcast start. |
| `actual_start_time` | `timestamptz` | `null` | Yes | No | Actual broadcast start (set by YouTube). |
| `actual_end_time` | `timestamptz` | `null` | Yes | No | Actual broadcast end (set by YouTube). |
| `stream_status` | `stream_status` | `'created'` | No | No | Lifecycle state of the stream. |
| `stream_url` | `text` | `null` | Yes | No | YouTube watch URL. |
| `stream_key` | `text` | `null` | Yes | No | RTMP stream key for encoder setup. |
| `ingestion_url` | `text` | `null` | Yes | No | RTMP ingestion server URL. |
| `created_by` | `uuid` | None | No | No | Foreign key to `users.id`. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |

Additional constraint:

- Add `unique (workspace_id, youtube_broadcast_id)` to support upsert during YouTube sync.

Important notes:

- Streams are a local cache of YouTube API data. The `syncStreamsFromYouTube()` function reconciles local state with YouTube.
- `stream_key` and `ingestion_url` are sensitive — only users with `can_create` see them in the UI.
- Editing a stream is only permitted when `stream_status` is `created`.

## Schema Boundary

These are read-model fields and should not be stored as standalone table columns:

- `equipment.bookedBy`
- `bookings.equipmentName`
- `bookings.duration`

Those should be derived after fetch.

## Workspace Scoping Strategy

Use `workspace_id` on top-level operational tables that need direct scoping, workspace-level list filtering, and future row-level security:

- `requests`
- `equipment`
- `bookings`
- `streams`
- `youtube_connections`

Do not add `workspace_id` to subordinate rows that already inherit scope from their parent:

- `request_assignees`
- `booking_items`

Keep these tables global rather than workspace-scoped:

- `users`
- `roles`
- `user_roles`
- `colors`
