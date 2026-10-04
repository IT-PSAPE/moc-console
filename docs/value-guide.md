# Value Guide

This document describes the app-facing entities and the runtime value conventions the UI depends on.

Use it with:

- [schema-reference.md](./schema-reference.md) for the normalized database view
- [data-flow-reference.md](./data-flow-reference.md) for runtime mapping, seed-data context, and fetch-time shaping

## Runtime Shape Summary

| Domain | App shape | Current source | Important note |
| --- | --- | --- | --- |
| Requests | Mostly row-shaped | Neon PostgreSQL through MOC API and `@moc/sdk` | `dueDate` is required in the app model. |
| Auth | Profile plus role | Better Auth in Neon Functions; sessions verified by MOC API | Profiles include `telegramChatId`; password recovery completes on a dedicated route. |
| Workspace | Membership-filtered directory views | Neon PostgreSQL through MOC API and `@moc/sdk` | Membership controls selected workspace access; pending join requests do not grant workspace access. |
| Equipment | Normalized rows with booking-derived display data | Neon PostgreSQL through MOC API and `@moc/sdk` | `bookedBy` stays a runtime convenience field. |
| Venues | Venue list plus booking objects with a DERIVED status | Neon PostgreSQL through MOC API and `@moc/sdk` | The stored `status` is only `auto` or `cancelled`; `booked`/`in_progress`/`completed` are derived from the clock and never written. |
| Streams | YouTube live streams with workspace-level OAuth | Neon PostgreSQL and MOC API | Local `streams` rows cache provider state. YouTube and Zoom calls go through server-side API routes; provider credentials stay server-side. |

## Global Rules

### IDs

- Database ids should be `uuid`.
- Frontend ids remain strings.
- The app should treat ids as opaque strings.
- `users.id` is the stable identity used by MOC authentication and domain records.

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

- `resetPassword()` sends recovery mail through the configured server-side mail transport with a link to `/password-recovery`
- the recovery screen consumes the signed MOC recovery token through the typed SDK
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

## Venues

### Venue read model

Current runtime shape:

- `id`
- `name`
- `location`
- `capacity`
- `active`
- `sortOrder`

The public request app sees a narrower shape (`PublicVenue`: `id`, `name`,
`location`, `capacity`) returned by the named public catalog API operation, which
only returns active venues.

### Venue event read model

Current runtime shape:

- `id`
- `name`
- `description`
- `active`
- `sortOrder`

The public request app sees a narrower shape (`PublicVenueEvent`: `id`,
`name`, `description`) returned by the named public catalog API operation, which
only returns active events.

"Other" is not an event. It is the sentinel `VENUE_EVENT_OTHER_ID` in a
picker, and it submits no event id at all — just free text. Nothing may create
a `venue_events` row to represent it.

### Venue booking read model

Current runtime shape:

- `id`
- `venueId`
- `venueName`
- `venueLocation`
- `eventId`, `eventName`, `eventOther`
- `trackingCode`
- `title`
- `requestedBy`
- `notes`
- `status`
- `startsAt`
- `endsAt`
- `cancelledAt`, `cancelledBy`, `cancelReason`

Important rules:

- `venueName` and `venueLocation` are joined from venue data, and `eventName`
  from event data.
- **Never branch on `eventName` vs `eventOther` in UI.** Exactly one of them is
  set — call `venueBookingEventLabel` for what the booking is for, and
  `isOtherVenueBookingEvent` when it matters that the submitter wrote it
  themselves. Bookings made before events existed have neither and fall back to
  their title.
- `title` is derived by the public submission operation from whichever of the two is set; no
  client supplies it.
- `requestedBy` is free text in storage and the runtime model.
- **`status` is not the status a reader should see.** It is the stored state and
  is only ever `auto` or `cancelled`. The reader-facing phase — `booked`,
  `in_progress`, `completed`, `cancelled` — is derived from the clock against
  `startsAt`/`endsAt` by `deriveVenueBookingPhase` in `@moc/types/venues`. No
  UI may branch on the raw `status`, and nothing writes a phase back.
- Derive a list of bookings against a single instant (pass the same `at` to
  every call) so rows in one render cannot disagree about the current time.
- The duration is derived in the app, not stored.
- Slot rows exist in storage but are not part of the read model: a booking is
  always one continuous block, so `startsAt`/`endsAt` describe it fully.

## Streams

### YouTube connection entity

Runtime expectations:

- one connection per workspace, managed by admins only
- the connection carries the YouTube channel ID and display name
- OAuth tokens are stored server-side and never exposed to the client
- token refresh is handled automatically by MOC API before each provider call

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

1. **Create**: Client calls the typed stream capability -> MOC API creates the YouTube broadcast and stream, binds them, and stores the resulting domain record in Neon PostgreSQL.
2. **Sync**: Client requests synchronization through MOC API. The server reads live and upcoming broadcasts, then looks up only tracked streams still in flight but absent from both lists. It updates tracked rows and adopts only live or upcoming broadcasts, preventing a late "stream created" notification for finished or never-started broadcasts.
3. **Update**: Client sends an explicit typed operation -> MOC API updates YouTube -> API persists the local record.
4. **Delete**: Client sends an explicit typed operation -> MOC API deletes on YouTube -> API removes the local row.

### Authentication and provider boundary

The Console completes the Google authorization redirect and exchanges the
authorization code through MOC API. API routes validate the signed-in user and
workspace permission, keep OAuth tokens in Neon PostgreSQL, refresh tokens as
needed, and proxy only the supported YouTube and Zoom operations. Client
configuration contains public OAuth client identifiers only; provider secrets
and access tokens never enter frontend bundles.

## Current Implementation Gaps

- Workspace membership is only surfaced explicitly in the users screen today. Other domains resolve one active workspace at fetch time rather than exposing a workspace switcher everywhere.

That gap is acceptable for now as long as the schema reference remains the source of truth for storage and the SDK/API layer keeps the conversions explicit.
