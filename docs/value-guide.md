# Value Guide

This document describes the app-facing entities and the runtime value conventions the UI depends on.

Use it with:

- [schema-reference.md](./schema-reference.md) for the normalized database view
- [data-flow-reference.md](./data-flow-reference.md) for runtime mapping, seed-data context, and fetch-time shaping

## Runtime Shape Summary

| Domain | App shape | Current source | Important note |
| --- | --- | --- | --- |
| Requests | Mostly row-shaped | Supabase | `dueDate` is now treated as required in the app model. |
| Auth | Profile plus role | Supabase Auth + Supabase | User profiles now include `telegramChatId`, and password recovery completes on a dedicated route. |
| Workspace | Membership-filtered directory views | Supabase with runtime fallback | Users can belong to multiple workspaces; runtime can fall back to the seeded default workspace for unresolved scope. |
| Equipment | Denormalized inventory and booking objects | Supabase | `bookedBy` stays a runtime convenience field. |
| Broadcast | Playlists with nested queue entries | Supabase | Queue rows are normalized in storage and re-expanded into cue objects after fetch. |
| Cue Sheet | Events, checklists, tracks, and cues as nested objects | Supabase | Storage is split into templates and runs even though the runtime API still exposes a combined `kind` model. |
| Streams | YouTube live streams with workspace-level OAuth | Supabase + Edge Functions | Local `streams` table caches YouTube broadcast data. All YouTube API calls are proxied through Supabase Edge Functions to keep OAuth secrets server-side. |

## Global Rules

### IDs

- Database ids should be `uuid`.
- Frontend ids remain strings.
- The app should treat ids as opaque strings.
- `users.id` should match the Supabase Auth id.

### Dates

- Datetime fields should remain valid ISO strings in the frontend.
- Required schedule fields should not be modeled as nullable in the app when the schema requires them.
- UI date comparisons should continue using `new Date(...)`.

### Naming

- Database rows are `snake_case`.
- Frontend entities are `camelCase`.
- Joined and derived fields belong in the mapping layer, not the schema.

## Requests

### Request entity

Runtime expectations:

- `dueDate` is required.
- `requestedBy` is required free text.
- `who`, `what`, `when`, `where`, `why`, and `how` remain short narrative strings.
- `notes`, `flow`, and `content` remain optional in the app layer.

### Request assignees

Runtime storage:

- request assignments store only the user id plus the free-text duty

Runtime read model:

- resolved assignee objects should include:
  - `id`
  - `name`
  - `surname`
  - `email`
  - `telegramChatId`
  - `duty`

### Request duty presets

- Duty presets are no longer modeled as a database table.
- They now belong in code as default suggestions.
- Custom duty text is still allowed at assignment time.

## Auth

### User profile entity

Runtime expectations:

- `name` and `surname` remain separate fields.
- `email` remains unique.
- `telegramChatId` is nullable until the Telegram integration exists.

### Password recovery flow

Runtime expectations:

- `resetPassword()` should send a Supabase email with `redirectTo` pointing at `/password-recovery`
- the recovery screen should accept either the Supabase recovery hash or a `code` query param exchange
- auth state should clear the cached workspace scope whenever the session changes
- `updatePassword()` should complete inside the recovery route, not by overloading the login screen

### Role entity

Runtime expectations:

- keep CRUD flags
- keep `canManageRoles`
- remove `canManageAssignees`

Current code assumption:

- user-management screens now key off `canManageRoles`

## Workspace

### Workspace entity

Runtime expectations:

- workspace records should stay lightweight:
  - `id`
  - `name`
  - `slug`
- users can belong to multiple workspaces
- the current signed-in user's memberships should drive workspace tabs in management screens
- when memberships are absent during bootstrap, the app may temporarily resolve the seeded `default-workspace`

### Workspace membership entity

Runtime expectations:

- membership rows only need:
  - `workspaceId`
  - `userId`
- workspace membership should be the source of truth for which users appear under a selected workspace
- subordinate records should not duplicate workspace membership when the parent record already carries `workspaceId`

## Equipment

### Equipment read model

Current runtime shape:

- `id`
- `name`
- `serialNumber`
- `category`
- `status`
- `location`
- `notes`
- `lastActiveDate`
- `bookedBy`
- `thumbnail`

Important rule:

- `bookedBy` is runtime display data only.
- It should come from the active booking context, not from the `equipment` table itself.

### Booking read model

Current runtime shape:

- `id`
- `equipmentId`
- `equipmentName`
- `bookedBy`
- `checkedOutDate`
- `expectedReturnAt`
- `returnedDate`
- `duration`
- `notes`
- `status`

Important rules:

- `equipmentName` is joined from equipment data.
- `bookedBy` is free text in storage and the runtime model.
- `duration` is derived in the app.

## Broadcast

### Media entity

Current runtime shape still includes a `duration` field in some app flows.

Schema direction:

- storage should not treat media duration as a required table column
- runtime duration can still exist when extracted from uploaded media metadata

### Playlist entity

Runtime expectations:

- `musicId` should be the stored relation when background music exists
- `defaultImageDuration` should remain a positive number
- queue item duration can override the playlist default

### Queue item entity

Runtime expectations:

- `mediaId` is the stored relation
- `duration` is nullable and acts as the item-level override
- `disabled` defaults to `false`

Denormalized runtime fields such as media name or type are acceptable after fetch, but they should not become storage columns.

## Cue Sheet

### Event templates vs events

- template data and live event data are now conceptually separate
- the combined `kind` and `templateId` shape is no longer the target schema
- the current runtime still uses combined objects, but the schema now treats templates and event runs as separate tables

### Checklist templates vs checklists

- the same separation applies to checklist templates and checklist runs
- template duplication should copy sections and items into live checklist rows

### Track colors

Runtime rule:

- tracks should carry a stable `colorKey`
- UI code should map `colorKey` to the actual CSS value
- the underlying storage lookup is now conceptually a shared `colors` table, not a track-only table

Current code update:

- cue-sheet track data now uses color keys instead of raw CSS values

### Cue timing

Runtime expectations:

- use `start` and `duration` conceptually in schema
- the current app still exposes `startMin` and `durationMin` in its runtime types
- that is a runtime naming detail, not the target storage naming

## Streams

### YouTube connection entity

Runtime expectations:

- one connection per workspace, managed by admins only
- the connection carries the YouTube channel ID and display name
- OAuth tokens are stored server-side and never exposed to the client
- token refresh is handled automatically by the Edge Function before each API call

Runtime read model:

- `id`
- `workspaceId`
- `channelId`
- `channelTitle`
- `connectedBy`
- `createdAt`

### Stream entity

Runtime expectations:

- streams are a local cache of YouTube liveBroadcast data
- `streamStatus` tracks the lifecycle: `created` -> `ready` -> `live` -> `complete`
- editing is only permitted when `streamStatus` is `created`
- `streamKey` and `ingestionUrl` are sensitive and only shown to users with `can_create`
- `privacyStatus` maps to YouTube's privacy settings: `public`, `private`, `unlisted`

Runtime read model:

- `id`
- `workspaceId`
- `youtubeBroadcastId`
- `youtubeStreamId`
- `title`
- `description`
- `thumbnailUrl`
- `privacyStatus`
- `isForKids`
- `scheduledStartTime`
- `actualStartTime`
- `actualEndTime`
- `streamStatus`
- `streamUrl`
- `streamKey`
- `ingestionUrl`
- `createdBy`
- `createdAt`
- `updatedAt`

### Stream data flow

1. **Create**: Client sends form data to `mutate-streams.ts` -> Edge Function creates YouTube broadcast + stream -> binds them -> returns IDs -> client inserts into local `streams` table
2. **Sync**: Client calls `syncStreamsFromYouTube()` -> Edge Function fetches all broadcasts from YouTube -> client upserts each into local DB
3. **Update**: Client sends changes to Edge Function -> YouTube API updates -> local DB updated
4. **Delete**: Edge Function deletes on YouTube -> local row deleted

### Edge Function architecture

The project uses two Supabase Edge Functions for YouTube integration:

- `youtube-oauth-callback` — handles the Google OAuth redirect, exchanges auth code for tokens, stores in `youtube_connections`, redirects back to the SPA
- `youtube-api` — proxies all YouTube Data API calls, validates Supabase JWT, auto-refreshes expired tokens, supports actions: `list-streams`, `create-stream`, `update-stream`, `delete-stream`, `get-connection`, `disconnect`

Environment secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) are set via `supabase secrets set` and never exposed to the client. Only `VITE_GOOGLE_CLIENT_ID` is available client-side for constructing the OAuth consent URL.

## Current Implementation Gaps

- Cue-sheet events and checklists still use combined template/instance app objects even though the target schema now separates them.
- Playlist `videoSettings` remain frontend-only runtime data; they are not persisted in the current schema.
- Media `duration` still exists as a runtime field in some flows even though storage does not require it.
- Workspace membership is only surfaced explicitly in the users screen today. Other domains resolve one active workspace at fetch time rather than exposing a workspace switcher everywhere.

That gap is acceptable for now as long as the schema doc remains the source of truth for storage and the runtime layer keeps the conversions explicit.
