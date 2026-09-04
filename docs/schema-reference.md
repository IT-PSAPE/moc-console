# Schema Reference

This document describes the current relational schema after the checked-in
migration ledger has been applied.

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
- Source of truth: [`supabase/`](../supabase/readme.md). The phase files are a
  historical baseline; the target-schema cleanup is the current convergence
  script. Do not apply every historical patch wholesale.
- Credential boundary: `private.integration_oauth_tokens` is server-only
  storage. It is intentionally excluded from client schema generation and
  must never be queried by browser code.

## Table Overview

| Table | Purpose | Primary key | Key relations |
| --- | --- | --- | --- |
| `users` | App user profiles aligned to Supabase Auth | `id` | `id -> auth.users.id` |
| `workspaces` | Workspace containers for operational data | `id` | Referenced by `workspace_users.workspace_id` and workspace-scoped domain tables |
| `workspace_users` | Accepted membership and workspace-scoped role | `id` | `workspace_id -> workspaces.id`, `user_id -> users.id`, `role_id -> roles.id` |
| `workspace_join_requests` | Pending workspace access requests | `id` | `workspace_id -> workspaces.id`, `user_id -> users.id` |
| `roles` | Role definitions and permissions | `id` | Referenced by `workspace_users.role_id` |
| `requests` | Work requests | `id` | `workspace_id -> workspaces.id`; referenced by `request_assignees.request_id` |
| `request_assignees` | Request-to-user assignments | `id` | `request_id -> requests.id`, `user_id -> users.id` |
| `equipment` | Inventory records | `id` | `workspace_id -> workspaces.id`; referenced by `booking_items.equipment_id` |
| `bookings` | Booking header and lifecycle | `id` | `workspace_id -> workspaces.id`; referenced by `booking_items.booking_id` |
| `booking_items` | Equipment assigned to a booking | `id` | `booking_id -> bookings.id`, `equipment_id -> equipment.id` |
| `checklist_templates` | Reusable checklist definitions | `id` | `workspace_id -> workspaces.id` |
| `checklists` | Scheduled checklist runs | `id` | `workspace_id -> workspaces.id`, optional `request_id -> requests.id` |
| `broadcasts` | Workspace-scoped broadcast playlists for the public player | `id` | `workspace_id -> workspaces.id`, `created_by -> users.id` |
| `broadcast_items` | Ordered audio/video files belonging to a broadcast playlist | `id` | `broadcast_id -> broadcasts.id` |
| `youtube_connections` | Workspace-level YouTube connection metadata | `id` | `workspace_id -> workspaces.id`, `connected_by -> users.id` |
| `streams` | YouTube live stream records | `id` | `workspace_id -> workspaces.id`, `created_by -> users.id` |
| `zoom_connections` | Workspace-level Zoom connection metadata | `id` | `workspace_id -> workspaces.id`, `connected_by -> users.id` |
| `zoom_meetings` | Zoom meeting records | `id` | `workspace_id -> workspaces.id`, `created_by -> users.id` |

## Enum Domains

| Name | Allowed values |
| --- | --- |
| `request_priority` | `low`, `medium`, `high`, `urgent` |
| `request_status` | `not_started`, `in_progress`, `completed`, `archived` |
| `request_category` | `video_production`, `video_shooting`, `graphic_design`, `event`, `education` |
| `equipment_category` | `camera`, `lens`, `lighting`, `audio`, `support`, `monitor`, `cable`, `accessory` |
| `equipment_status` | `available`, `booked`, `booked_out`, `maintenance` |
| `booking_status` | `booked`, `checked_out`, `returned`, `archived` |
| `broadcast_kind` | `audio`, `video` |
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

- Seed one workspace with slug `default-workspace`. Signup may request it, but
  the account remains pending until an owner or admin approves the membership.

### `workspace_users`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `user_id` | `uuid` | None | No | No | Foreign key to `users.id`. |
| `role_id` | `uuid` | None | No | No | Workspace-scoped foreign key to `roles.id`. |
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
- Assignees must be members of the request's workspace; a database trigger
  enforces this for direct writes and RPCs.

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
| `tracking_code` | `text` | None | No | Yes | Public-facing booking tracking identifier. |
| `title` | `text` | None | No | No | Booking title, 1–120 characters. |
| `booked_by` | `text` | None | No | No | Free-text name of the person the booking is for. Not necessarily a logged-in user. |
| `checked_out_at` | `timestamptz` | None | No | No | Start/checkout timestamp. |
| `expected_return_at` | `timestamptz` | None | No | No | Due-back timestamp. |
| `returned_at` | `timestamptz` | `null` | Yes | No | Null until the item is returned. |
| `notes` | `text` | `null` | Yes | No | Booking notes. |
| `status` | `booking_status` | `booked` | No | No | Booking lifecycle state for the whole batch. |
| `created_at` | `timestamptz` | `now()` | No | No | Booking creation time. |

### `booking_items`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `booking_id` | `uuid` | None | No | No | Foreign key to `bookings.id`. |
| `equipment_id` | `uuid` | None | No | No | Foreign key to `equipment.id`. |

Important normalization rules:

- A booking is a batch; `booking_items` stores its equipment assignments.
- A booking item must reference equipment in the booking's workspace; a
  database trigger enforces this.
- `bookings` stores `booked_by` as text, not a user id.
- The human-readable duration shown in the UI should be derived, not stored.

## Checklists

### `checklists`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `request_id` | `uuid` | `null` | Yes | No | Optional foreign key to `requests.id`. |
| `name` | `text` | None | No | No | Run name. |
| `description` | `text` | `''` | No | No | Run description. |
| `scheduled_at` | `timestamptz` | None | No | No | Scheduled execution date. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation time. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update time. |

Scope rules:

- `checklist_sections` and `checklist_items` inherit the run's workspace.
- A checklist item section must belong to the same checklist, and a template
  item section must belong to the same template; triggers enforce both joins.
- Checklist assignees must be workspace members. An optional linked request
  must be in the checklist workspace. Both checks run in the database.

## Broadcasts

### `broadcasts`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | No | Foreign key to `workspaces.id`. |
| `created_by` | `uuid` | None | No | No | Foreign key to `users.id`. |
| `title` | `text` | None | No | No | Broadcast playlist title. |
| `description` | `text` | `''` | No | No | Optional operator-facing summary. |
| `slug` | `text` | None | No | Yes | Public URL identifier used by the separate broadcast app. |
| `kind` | `broadcast_kind` | None | No | No | Playlist media kind: `audio` or `video`. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |

### `broadcast_items`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `broadcast_id` | `uuid` | None | No | No | Foreign key to `broadcasts.id`. |
| `title` | `text` | None | No | No | Source file title, defaulting to the uploaded filename. |
| `sort_order` | `integer` | None | No | Per broadcast | Zero-based playlist position. |
| `storage_bucket` | `text` | `'broadcast-media'` | No | No | Storage bucket holding the public media asset. |
| `storage_path` | `text` | None | No | No | Object path within the storage bucket. |
| `public_url` | `text` | None | No | No | Public playback URL resolved from Storage. |
| `mime_type` | `text` | None | No | No | Uploaded file MIME type. |
| `file_size_bytes` | `bigint` | None | No | No | Uploaded file size. |
| `duration_seconds` | `numeric` | `null` | Yes | No | Best-effort client-side metadata captured at upload time. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |

Important notes:

- Each broadcast contains only one media kind: all items must be audio when `kind = 'audio'`, or video when `kind = 'video'`.
- `broadcast_items` are ordered by `sort_order`; the public player continuously loops the playlist and automatically preloads the next item.
- Broadcast metadata and assets are publicly readable by design. Public assets live in the `broadcast-media` storage bucket so the player can preload the next item without signed URLs.
- Broadcast and item changes are included in the `supabase_realtime` publication so an open player can refresh its queue without a reload.

## Integrations

### `youtube_connections`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | Yes | Foreign key to `workspaces.id`. One connection per workspace. |
| `channel_id` | `text` | None | No | No | YouTube channel ID. |
| `channel_title` | `text` | None | No | No | YouTube channel display name. |
| `token_expires_at` | `timestamptz` | None | No | No | Access token expiry timestamp. |
| `status` | `youtube_connection_status` | `'active'` | No | No | Connection health, including `reauth_required`. |
| `presets` | `jsonb` | `null` | Yes | No | Workspace stream preset metadata. |
| `connected_by` | `uuid` | None | No | No | Foreign key to `users.id`. Admin who connected the account. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation timestamp. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update timestamp. |

Important notes:

- One YouTube connection per workspace, enforced by `unique (workspace_id)`.
- OAuth access and refresh tokens are in `private.integration_oauth_tokens`,
  never in this public metadata table. Only the API service role can execute
  the private-storage RPCs.
- Browser clients call the authenticated `/api/youtube/v3/*` proxy with an
  explicit workspace context; the API refreshes credentials server-side.

### `private.integration_oauth_tokens`

This private-schema table is not exposed through the client data API.

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `provider` | `text` | None | No | Composite | Restricted to `youtube` or `zoom`. |
| `workspace_id` | `uuid` | None | No | Composite | Foreign key to `workspaces.id`. |
| `access_token` | `text` | None | No | No | Server-only provider credential. |
| `refresh_token` | `text` | None | No | No | Server-only provider credential. |
| `token_expires_at` | `timestamptz` | None | No | No | Provider access-token expiry. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last credential update. |

### `zoom_connections`

| Column | Postgres type | Default | Nullable | Unique | Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | No | Yes | Primary key. |
| `workspace_id` | `uuid` | None | No | Yes | One connection per workspace. |
| `zoom_user_id` | `text` | None | No | No | Connected Zoom account identifier. |
| `email` | `text` | None | No | No | Connected account email. |
| `display_name` | `text` | None | No | No | Connected account name. |
| `token_expires_at` | `timestamptz` | None | No | No | Access-token expiry metadata. |
| `connected_by` | `uuid` | None | No | No | User who connected the account. |
| `created_at` | `timestamptz` | `now()` | No | No | Creation time. |
| `updated_at` | `timestamptz` | `now()` | No | No | Last update time. |

### `zoom_meetings`

`zoom_meetings` stores workspace-scoped provider meeting metadata, keyed by
`unique (workspace_id, zoom_meeting_id)`. Its credential source is the same
private integration-token table; browser code must call the authenticated
`/api/zoom/v2/*` proxy rather than Zoom directly.

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
- `checklist_templates`
- `checklists`
- `broadcasts`
- `streams`
- `youtube_connections`
- `zoom_connections`
- `zoom_meetings`

Do not add `workspace_id` to subordinate rows that already inherit scope from their parent:

- `request_assignees`
- `booking_items`
- `checklist_sections`
- `checklist_items`
- `checklist_item_assignees`

Keep these tables global rather than workspace-scoped:

- `users`
- `roles`
