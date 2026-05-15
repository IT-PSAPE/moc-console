# Supabase Agent Prompt

Use the prompt below with a Supabase AI agent for this project. It is written for a brand-new Supabase project with no existing schema, no existing seed data, and no existing migrations.

The prompt is intentionally detailed because the frontend already expects the documented Supabase tables, joins, RPCs, and fallback workspace behavior. The backend build needs to satisfy those contracts directly without inventing a different model.

## Copy This Prompt

```text
You are building the complete Supabase backend for the `moc-console` project from scratch.

This is a blank Supabase project. Assume:
- there are no tables yet
- there are no enums yet
- there are no triggers yet
- there are no functions yet
- there are no policies yet
- there is no seed data yet
- the frontend already exists and must be matched, not redesigned

Your job is to create the database, bootstrapping flows, row-level security, seed data, and database-side helper functions so the existing frontend can run against Supabase end-to-end.

Do not give me a high-level plan. Produce concrete, executable Supabase SQL and a clear implementation artifact set.

## Primary Goal

Build a production-ready Supabase schema and access model for this app with:
- Postgres enums for fixed domain states
- relational tables for mutable/shared lookup data
- auth-to-profile bootstrap logic
- role assignment bootstrap logic
- workspace membership bootstrap logic
- database-side template duplication flows
- RLS and policies as the source of truth for access control
- idempotent seed data for roles, colors, and the default workspace

The frontend must not be the source of truth for permissions. Permissions must live in Supabase through RLS and policies.

## Source Of Truth Inside This Repo

If repo files are available to you, read these first and treat them as authoritative:
- `docs/schema-reference.md`
- `docs/value-guide.md`
- `docs/data-flow-reference.md`
- `docs/phases/phase-11-seed-data.sql`
- `src/lib/auth-context.tsx`
- `src/data/current-workspace.ts`
- `src/data/fetch-users.ts`
- `src/data/fetch-workspaces.ts`
- `src/data/fetch-assignees.ts`
- `src/screens/auth/reset-password.tsx`
- `src/screens/auth/password-recovery.tsx`
- `src/features/users/users-provider.tsx`
- `src/features/cue-sheet/cue-sheet-provider.tsx`
- `src/types/cue-sheet/timeline.ts`
- `src/types/requests/constants.ts`
- `src/types/equipment/constants.ts`
- `src/types/broadcast/constants.ts`

Use those files to align names, data shapes, and behavioral expectations.

Important:
- the repo already contains phased SQL docs; if they disagree with your first instinct, prefer reconciling to the checked-in docs instead of inventing alternate names
- the frontend now resolves one active workspace through `workspace_users` with a fallback to the seeded `default-workspace`
- password reset is a two-step flow: request reset email, then land on `/password-recovery` to call `updatePassword()`

## Non-Negotiable Architecture Rules

1. Use migrations, not ad hoc dashboard-only changes.
2. Use `public` for app-facing tables.
3. Use `private` for helper functions that should not be exposed through the data API.
4. Enable RLS on every app-facing table in `public`.
5. Do not put business-critical authorization in the frontend.
6. Do not create extra schema objects that contradict the repo docs.
7. Keep names short and descriptive.
8. Prefer explicit, boring SQL over clever abstractions.
9. Make every seed and bootstrap step idempotent.
10. Use fully qualified object names inside security-definer functions.

## Supabase-Specific Design Decisions

Use these decisions exactly:

### Use Postgres enums only for fixed state sets

Create enums for:
- `request_priority`: `low`, `medium`, `high`, `urgent`
- `request_status`: `not_started`, `in_progress`, `completed`, `archived`
- `request_category`: `video_production`, `video_shooting`, `graphic_design`, `event`, `education`
- `equipment_category`: `camera`, `lens`, `lighting`, `audio`, `support`, `monitor`, `cable`, `accessory`
- `equipment_status`: `available`, `booked`, `booked_out`, `maintenance`
- `booking_status`: `booked`, `checked_out`, `returned`
- `media_type`: `image`, `audio`, `video`
- `playlist_status`: `draft`, `published`
- `cue_type`: `performance`, `technical`, `equipment`, `announcement`, `transition`

Do not use enums for:
- roles
- colors
- workspaces
- request duty presets

Reason:
- roles need mutable permission flags
- colors are shared lookup data and must remain rebrand-safe
- workspace rows are operational data
- duty presets belong in frontend code, not relational storage

### Use database functions, not Edge Functions, for core relational workflows

For this scope, use Postgres/database functions and triggers for:
- auth bootstrap
- updated timestamp maintenance
- workspace-aware helper logic
- template-to-run duplication
- equipment status synchronization

Do not introduce Supabase Edge Functions unless you absolutely need third-party HTTP integrations. This project does not currently require that for the initial backend.

## Required Schemas

Create:
- `public`
- `private`

Do not expose `private` through the data API.

## Extensions

Enable what is needed for this schema only.

At minimum:
- `pgcrypto` for `gen_random_uuid()`

## Tables To Create

Create the following tables in `public` with the exact relationships below.

### Auth and identity

#### `users`
- `id uuid primary key references auth.users(id) on delete cascade`
- `name text not null`
- `surname text not null`
- `email text not null unique`
- `telegram_chat_id text unique null`

Notes:
- `users.id` must match `auth.users.id`
- this is the app profile table, not the auth schema itself

#### `workspaces`
- `id uuid primary key default gen_random_uuid()`
- `name text not null unique`
- `slug text not null unique`
- `description text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `workspace_users`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `user_id uuid not null references public.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- unique `(workspace_id, user_id)`

#### `roles`
- `id uuid primary key default gen_random_uuid()`
- `name text not null unique`
- `can_create boolean not null default false`
- `can_read boolean not null default false`
- `can_update boolean not null default false`
- `can_delete boolean not null default false`
- `can_manage_roles boolean not null default false`

Keep role names short and use:
- `admin`
- `editor`
- `viewer`

#### `user_roles`
- `user_id uuid primary key references public.users(id) on delete cascade`
- `role_id uuid not null references public.roles(id) on delete restrict`

One user has one role in the current app model.

### Requests

#### `requests`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `title text not null`
- `priority public.request_priority not null`
- `status public.request_status not null default 'not_started'`
- `category public.request_category not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `requested_by text not null`
- `due_date timestamptz not null`
- `who text not null`
- `what text not null`
- `when_text text not null`
- `where_text text not null`
- `why text not null`
- `how text not null`
- `notes text null`
- `flow text null`
- `content text null`

#### `request_assignees`
- `id uuid primary key default gen_random_uuid()`
- `request_id uuid not null references public.requests(id) on delete cascade`
- `user_id uuid not null references public.users(id) on delete cascade`
- `duty text not null`
- unique `(request_id, user_id, duty)`

Do not create:
- `request_roles`
- `request_duties`
- `request_duty_presets`

Duty presets stay in frontend code.

### Equipment

#### `equipment`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `name text not null`
- `serial_number text not null unique`
- `category public.equipment_category not null`
- `status public.equipment_status not null default 'available'`
- `location text not null`
- `notes text null`
- `last_active_on date null`
- `thumbnail_url text null`

Do not store `booked_by` on `equipment`.

#### `bookings`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `equipment_id uuid not null references public.equipment(id) on delete cascade`
- `booked_by text not null`
- `checked_out_at timestamptz not null`
- `expected_return_at timestamptz not null`
- `returned_at timestamptz null`
- `notes text null`
- `status public.booking_status not null default 'booked'`

Important:
- `booked_by` is free text, not a user id
- the UI derives booking duration; do not store a human-readable duration string

### Broadcast

#### `media`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `name text not null`
- `type public.media_type not null`
- `url text not null`
- `thumbnail_url text null`
- `created_at timestamptz not null default now()`

Do not store `duration` as a required column in `media`.

#### `playlists`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `name text not null`
- `description text not null default ''`
- `status public.playlist_status not null default 'draft'`
- `created_at timestamptz not null default now()`
- `music_id uuid null references public.media(id) on delete set null`
- `default_image_duration integer not null default 10`

#### `queue`
- `id uuid primary key default gen_random_uuid()`
- `playlist_id uuid not null references public.playlists(id) on delete cascade`
- `media_id uuid not null references public.media(id) on delete cascade`
- `sort_order integer not null`
- `duration integer null`
- `disabled boolean not null default false`
- unique `(playlist_id, sort_order)`

### Cue sheet templates and runs

#### `event_templates`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `title text not null`
- `description text not null default ''`
- `duration integer not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `template_tracks`
- `id uuid primary key default gen_random_uuid()`
- `event_template_id uuid not null references public.event_templates(id) on delete cascade`
- `name text not null`
- `color_id uuid not null references public.colors(id) on delete restrict`
- `sort_order integer not null`

#### `template_cues`
- `id uuid primary key default gen_random_uuid()`
- `template_track_id uuid not null references public.template_tracks(id) on delete cascade`
- `label text not null`
- `start integer not null`
- `duration integer not null`
- `type public.cue_type not null`
- `assignee text null`
- `notes text null`

#### `events`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `title text not null`
- `description text not null default ''`
- `scheduled_at timestamptz not null`
- `duration integer not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `colors`
- `id uuid primary key default gen_random_uuid()`
- `key text not null unique`
- `name text not null`

Do not store raw CSS values in the database.
The app maps `colors.key` to CSS tokens.

#### `tracks`
- `id uuid primary key default gen_random_uuid()`
- `event_id uuid not null references public.events(id) on delete cascade`
- `name text not null`
- `color_id uuid not null references public.colors(id) on delete restrict`
- `sort_order integer not null`

#### `cues`
- `id uuid primary key default gen_random_uuid()`
- `track_id uuid not null references public.tracks(id) on delete cascade`
- `label text not null`
- `start integer not null`
- `duration integer not null`
- `type public.cue_type not null`
- `assignee text null`
- `notes text null`

### Checklist templates and runs

#### `checklist_templates`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `name text not null`
- `description text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `template_sections`
- `id uuid primary key default gen_random_uuid()`
- `checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade`
- `name text not null`
- `sort_order integer not null`

#### `template_items`
- `id uuid primary key default gen_random_uuid()`
- `checklist_template_id uuid not null references public.checklist_templates(id) on delete cascade`
- `template_section_id uuid null references public.template_sections(id) on delete cascade`
- `label text not null`
- `sort_order integer not null`

#### `checklists`
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `name text not null`
- `description text not null default ''`
- `scheduled_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `checklist_sections`
- `id uuid primary key default gen_random_uuid()`
- `checklist_id uuid not null references public.checklists(id) on delete cascade`
- `name text not null`
- `sort_order integer not null`

#### `checklist_items`
- `id uuid primary key default gen_random_uuid()`
- `checklist_id uuid not null references public.checklists(id) on delete cascade`
- `section_id uuid null references public.checklist_sections(id) on delete cascade`
- `label text not null`
- `checked boolean not null default false`
- `sort_order integer not null`

## Workspace Scoping Rule

Put `workspace_id` only on top-level operational tables:
- `requests`
- `equipment`
- `bookings`
- `media`
- `playlists`
- `event_templates`
- `events`
- `checklist_templates`
- `checklists`

Do not add `workspace_id` to subordinate tables:
- `request_assignees`
- `queue`
- `template_tracks`
- `template_cues`
- `tracks`
- `cues`
- `template_sections`
- `template_items`
- `checklist_sections`
- `checklist_items`

Subordinate access must be derived from the parent row in RLS policies.

## Required Seed Data

Create idempotent seed data for these global tables:

### Roles

Seed exactly these rows:

#### `admin`
- `can_create = true`
- `can_read = true`
- `can_update = true`
- `can_delete = true`
- `can_manage_roles = true`

#### `editor`
- `can_create = true`
- `can_read = true`
- `can_update = true`
- `can_delete = true`
- `can_manage_roles = false`

#### `viewer`
- `can_create = false`
- `can_read = true`
- `can_update = false`
- `can_delete = false`
- `can_manage_roles = false`

### Colors

Seed exactly these color keys because the frontend already supports them:
- `blue`
- `purple`
- `red`
- `green`
- `orange`
- `pink`
- `yellow`
- `teal`
- `indigo`
- `rose`
- `sky`
- `violet`

Use a human-readable `name` for each row.

### Default workspace

Seed one default workspace:
- `name = 'Default Workspace'`
- `slug = 'default-workspace'`

Reason:
- the current frontend has no workspace picker during signup
- the app already assumes a fallback default workspace concept
- operational rows need a workspace scope from day one

## Required Triggers And Functions

### 1. Updated-at trigger

Create a reusable trigger function like `public.set_updated_at()` and apply it to every table that has `updated_at`.

Apply to:
- `workspaces`
- `requests`
- `event_templates`
- `events`
- `checklist_templates`
- `checklists`

### 2. Auth signup bootstrap trigger

Create a trigger on `auth.users` that runs after insert and does all of the following:
- inserts a row into `public.users`
- copies `name` and `surname` from `raw_user_meta_data`
- copies email from `auth.users.email`
- sets `telegram_chat_id` to `null`
- assigns the new user the `viewer` role in `public.user_roles`
- creates a `workspace_users` membership for the seeded `default-workspace`

Use a security-definer trigger function with explicit `search_path` handling and fully qualified table names.

Important:
- keep this function small and deterministic
- if required seed rows are missing, fail loudly with a clear error message
- write it so repeated migration runs remain safe

### 3. Auth email sync trigger

Create an additional trigger on `auth.users` for email updates so `public.users.email` stays in sync when the auth email changes.

Do not overwrite `name` or `surname` from auth metadata after initial creation. After signup, `public.users` is the editable app profile source of truth.

### 4. Equipment status synchronization

Create a trigger-driven sync so booking changes keep `equipment.status` aligned, with these rules:
- if equipment is currently `maintenance`, booking triggers must not override it
- if there is an active booking with `status = checked_out`, set equipment status to `booked_out`
- else if there is an active booking with `status = booked`, set equipment status to `booked`
- else set equipment status to `available`

The trigger must run after insert, update, and delete on `bookings`.

### 5. Template duplication RPC: event template -> event run

Create a database function/RPC named something short and clear, for example:
- `public.create_event_from_template`

It must:
- accept the template id
- accept a scheduled datetime for the new run
- optionally accept title/description overrides
- create a row in `public.events`
- copy all template tracks into `public.tracks`
- copy all template cues into `public.cues`
- preserve sort order
- return the created event row or created event id
- run transactionally

Use this because template duplication is currently happening in frontend mock code and must move into the database.

### 6. Template duplication RPC: checklist template -> checklist run

Create a database function/RPC named something short and clear, for example:
- `public.create_checklist_from_template`

It must:
- accept the checklist template id
- accept a scheduled datetime for the new run
- optionally accept name/description overrides
- create a row in `public.checklists`
- copy top-level template items into `public.checklist_items`
- copy template sections into `public.checklist_sections`
- copy section-linked template items into `public.checklist_items`
- preserve sort order
- initialize all run items with `checked = false`
- return the created checklist row or created checklist id
- run transactionally

### 7. Role bootstrap helper

Because every normal signup becomes `viewer`, the system still needs a safe path to make someone an `admin`.

Create one service-role/manual-SQL bootstrap helper for this, for example in `private`:
- `private.promote_user_to_role(p_user_email text, p_role_name text)`

Requirements:
- do not expose this helper via the public data API
- do not grant execute to `anon` or `authenticated`
- allow it to be run manually from SQL editor or migration/admin context
- it must upsert `public.user_roles`
- it must be idempotent

Without this, a blank project would deadlock role management because no one could become admin.

### 8. RLS helper functions

Create helper functions in `private` for policy reuse, such as:
- `private.current_user_role_name()`
- `private.current_user_can(permission text)`
- `private.is_workspace_member(p_workspace_id uuid)`

These helpers should make policies shorter and less error-prone.

If you use security-definer helpers:
- keep them in `private`
- fully qualify references
- do not expose the schema
- call them with schema-qualified names from policies

## RLS And Policy Requirements

Enable RLS on every `public` table.

### General auth rules

No anonymous access to application data.

Authenticated access only.

### Users and roles

#### `users`
- authenticated users can `select` their own profile row
- authenticated users can `update` their own profile row, but only safe profile fields
- admins can `select` all users
- admins can `update` all users
- no client-side delete policy needed

#### `roles`
- authenticated users can `select` roles
- only admins or service role may change role definitions
- if roles are treated as seed-only, you may make client writes impossible and reserve writes for migrations/manual SQL

#### `user_roles`
- authenticated users can `select` their own role mapping
- admins can `select` all role mappings
- admins can `insert` or `update` role mappings
- non-admin users must not be able to elevate themselves

#### `workspaces`
- authenticated users can `select` only workspaces they belong to
- write policies may be admin-only or service-role-only for now

#### `workspace_users`
- users can `select` their own memberships
- admins can `select` all memberships
- write access may be admin-only or service-role-only for now

### Workspace-scoped operational tables

For these top-level tables:
- `requests`
- `equipment`
- `bookings`
- `media`
- `playlists`
- `event_templates`
- `events`
- `checklist_templates`
- `checklists`

Policies must require both:
- workspace membership
- matching role permission flag

Use this model:
- `select` requires workspace membership and `can_read = true`
- `insert` requires workspace membership and `can_create = true`
- `update` requires workspace membership and `can_update = true`
- `delete` requires workspace membership and `can_delete = true`

### Subordinate tables

For these subordinate tables:
- `request_assignees`
- `queue`
- `template_tracks`
- `template_cues`
- `tracks`
- `cues`
- `template_sections`
- `template_items`
- `checklist_sections`
- `checklist_items`

Do not add `workspace_id`.

Instead, policies must derive access through the parent record.
Examples:
- `tracks` access derives from parent `events.workspace_id`
- `cues` access derives from parent track -> event -> workspace
- `template_cues` access derives from template_track -> event_template -> workspace

### RPC policy expectations

The template duplication RPCs must respect the same authorization model:
- the caller must be authenticated
- the caller must be a member of the template's workspace
- the caller must have `can_create = true`
- the function must not let a user clone data into a workspace they cannot access

Prefer `security invoker` for these RPCs unless there is a strong reason otherwise.
Do not bypass RLS casually.

## Indexing Requirements

Create indexes for:
- every foreign key column
- every top-level `workspace_id`
- role and membership lookup paths
- parent-plus-order access patterns

At minimum include indexes on:
- `workspace_users(workspace_id)`
- `workspace_users(user_id)`
- `user_roles(role_id)`
- `requests(workspace_id)`
- `request_assignees(request_id)`
- `request_assignees(user_id)`
- `equipment(workspace_id)`
- `bookings(workspace_id)`
- `bookings(equipment_id)`
- `media(workspace_id)`
- `playlists(workspace_id)`
- `queue(playlist_id, sort_order)`
- `event_templates(workspace_id)`
- `template_tracks(event_template_id, sort_order)`
- `template_cues(template_track_id, start)`
- `events(workspace_id)`
- `tracks(event_id, sort_order)`
- `cues(track_id, start)`
- `checklist_templates(workspace_id)`
- `template_sections(checklist_template_id, sort_order)`
- `template_items(checklist_template_id, sort_order)`
- `template_items(template_section_id, sort_order)`
- `checklists(workspace_id)`
- `checklist_sections(checklist_id, sort_order)`
- `checklist_items(checklist_id, sort_order)`
- `checklist_items(section_id, sort_order)`

If you add additional helpful indexes, keep them justified and minimal.

## Data And Modeling Rules You Must Preserve

1. `users.id` matches `auth.users.id`.
2. `colors` is a lookup table. Do not replace it with an enum.
3. Do not store raw CSS values in the DB for track colors.
4. Do not store `booked_by` on `equipment`.
5. Do not store `duration` as required media data.
6. Do not create `request_roles` or `request_duties` tables.
7. Template tables and live run tables are separate. Do not collapse them into one table with a `kind` column.
8. The app currently uses combined template/instance objects in memory, but the DB must use separate normalized tables.
9. Top-level operational rows carry workspace scope. Subordinate rows inherit it.
10. The backend must support both:
   - creating templates from scratch
   - creating live runs from templates

## Output Requirements

Produce the backend as a concrete implementation set, not prose only.

I want:
- SQL migrations in a sensible order
- seed SQL
- RLS policies
- helper functions
- trigger functions
- trigger creation statements
- RPCs for template duplication
- any grants/revokes required
- a short summary of how to bootstrap the first admin user
- a short summary of how the frontend should call the template-duplication RPCs later

If you need to make a judgment call, choose the option that best fits the existing frontend and explain that decision briefly at the end.

## Final Validation Checklist

Before finishing, verify all of these are true:
- all required enums exist
- all required tables exist
- all foreign keys are correct
- all seed data is idempotent
- all public tables have RLS enabled
- no policy allows anonymous access
- new signup creates `public.users`, `public.user_roles`, and `public.workspace_users`
- default signup role is `viewer`
- there is a safe manual path to create an `admin`
- template duplication works server-side for events
- template duplication works server-side for checklists
- equipment status can stay in `maintenance` without booking triggers overriding it
- subordinate tables do not duplicate `workspace_id`
- there are no unnecessary extra tables
- the result is aligned with the repo docs and current frontend assumptions
```

## Notes

This prompt intentionally pushes the agent toward:
- database functions for relational workflows
- RLS-centered authorization
- seed-backed bootstrapping for roles, colors, and workspace setup
- separate template/run tables for cue-sheet and checklist flows

That matches the current repo direction and avoids building a backend that fights the frontend model later.

## Research Basis

These official Supabase docs informed the prompt decisions:
- User management and auth-profile trigger pattern: https://supabase.com/docs/guides/auth/managing-user-data
- Postgres triggers: https://supabase.com/docs/guides/database/postgres/triggers
- Database functions: https://supabase.com/docs/guides/database/functions
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Edge Functions overview, to separate DB work from HTTP/serverless work: https://supabase.com/docs/guides/functions
- Generating TypeScript database types: https://supabase.com/docs/guides/api/rest/generating-types
