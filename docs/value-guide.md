# Value Guide

This document explains what values the codebase expects in practice, beyond the raw type signatures.

It complements [schema-reference.md](./schema-reference.md).

## Source Notes

- Requests are the only domain currently wired to real Supabase reads and writes.
- Equipment, broadcast, and cue-sheet mutations are mock implementations that return the passed data.
- User signup only creates a Supabase Auth account in the current code. This repository does not show profile-row or role-row creation for `users` and `user_roles`.

## Global Conventions

### IDs

- Keep ids as strings.
- Existing data uses readable prefixes:
  - Equipment: `eq-001`
  - Bookings: `bk-001`
  - Playlists: `bc-001` and temporary new ids like `pl-new-<timestamp>`
  - Media: `media-001`
  - Cues: `cue-001`
  - Slides: `slide-011a`
- Cue-sheet event, checklist, track, and timeline cue ids currently use UUID-like strings generated with `crypto.randomUUID()` for new records.
- Request ids come from Supabase and are treated as opaque strings.
- `users.id` is expected to match the Supabase Auth user id because profile lookup does `.eq("id", user.id)`.

### Dates

- Requests:
  - `createdAt`, `updatedAt`, and `dueDate` should be ISO datetime strings.
  - The request editor uses `datetime-local` and converts back with `new Date(value).toISOString()`.
  - Example: `2026-04-05T13:30:00.000Z`
- Equipment and broadcast:
  - Current mock data uses date-only strings.
  - Example: `2026-04-05`
- Equipment bookings:
  - `checkedOutDate` and `returnedDate` still come from current date-like mock data.
  - `expectedReturnAt` should be a full ISO datetime string so the app can calculate due-soon and overdue return states by hour.
- Cue sheet:
  - `createdAt` and `updatedAt` use ISO datetime strings.
  - Timeline cues use `startMin` and `durationMin` as numeric minute values, not datetimes.

### Null vs empty string

- Use `null` when the field truly means “no value”.
- Use empty string only where the model requires a string and the codebase already uses blank text.
- Current patterns:
  - `Request.dueDate`: `null` when not scheduled
  - `Request.notes`, `Request.flow`, `Request.content`: omitted in app model, persisted as `null`
  - `Equipment.bookedBy`: `null` when nobody has the item
  - `Equipment.notes`: often `""`, not `null`
  - `Equipment.thumbnail`: `null` when absent
  - `Booking.returnedDate`: `null` until returned
  - `MediaItem.thumbnail`: `null` when absent
  - `MediaItem.audioUrl`: `null` when absent
  - `MediaItem.slides`: `null` unless `type === "slide"`
  - `MediaItem.url`: current slide entries use `""`, even though the field is not nullable
- Cue-sheet `Cue.notes`: omitted when absent

## Requests

### `status`

Allowed values:

- `not_started`
- `in_progress`
- `completed`
- `archived`

Expected usage:

- Use `not_started` for newly created or restored requests.
- Use `in_progress` when work has started.
- Use `completed` when the work is done but should still appear in active/history logic.
- Use `archived` to hide the request from active request fetches and move it into archived views.

Behavior in the app:

- Active request fetches explicitly exclude `archived`.
- Unarchive sets the status back to `not_started`.
- Kanban only shows `not_started`, `in_progress`, and `completed`.

### `priority`

Allowed values:

- `low`
- `medium`
- `high`
- `urgent`

Expected usage:

- `low`: informational or low-risk work
- `medium`: normal default priority
- `high`: needs prioritization soon
- `urgent`: immediate attention

### `category`

Allowed values:

- `video_production`
- `video_shooting`
- `graphic_design`
- `event`
- `education`

Expected usage:

- `video_production`: end-to-end video jobs, editing, post, delivery
- `video_shooting`: shoot-day execution and capture work
- `graphic_design`: static or motion design work
- `event`: event support, coverage, logistics, media needs
- `education`: training, teaching, internal learning content

### `title`

- Keep it concise and scannable.
- This is the primary display name in lists, drawers, and breadcrumbs.
- Good examples:
  - `Youth Conference Promo Video`
  - `Sunday Service Graphics Update`

### `requestedBy`

- Keep this as a free-text requester label.
- Do not link it to teams or users yet; this field is intentionally lightweight.

### `updatedAt`

- Update this whenever request details, archive state, or kanban status changes.
- Use it as the app’s “last updated” timestamp instead of adding a separate `completedAt` field.

### 5W1H fields: `who`, `what`, `when`, `where`, `why`, `how`

- These fields are treated as required strings in the app model.
- Use short, direct sentence fragments rather than long documents.
- Recommended pattern:
  - `who`: the requester, audience, or responsible party
  - `what`: the deliverable or job to be done
  - `when`: timing or deadline context
  - `where`: location or channel
  - `why`: purpose or business/ministry reason
  - `how`: execution approach or constraints

Example:

- `who`: `Media team and worship department`
- `what`: `Capture and edit opener video`
- `when`: `Before Sunday 9 AM service`
- `where`: `Main auditorium and LED screens`
- `why`: `Support Easter service launch`
- `how`: `Two-camera shoot with lower-third graphics`

### `dueDate`

- Use `null` if no actual due date exists.
- Otherwise use a full ISO datetime string.
- Because overview screens calculate overdue/upcoming by comparing `new Date(dueDate)` to `new Date()`, avoid loose human-readable values here.

### `notes`, `flow`, `content`

- `notes`: secondary context, caveats, reminders
- `flow`: sequence or run-of-show style notes
- `content`: larger free-form content block for detailed briefing or body copy

Current implementation note:

- `RequestNotes` and `RequestFlow` only render when the value is truthy.
- Blank strings behave like “not provided”.

### Assignees and duties

Fields involved:

- `request_assignees.user_id`
- `request_assignees.duty`

Expected usage:

- `user_id` should point to a real `users.id`.
- `duty` can come from `request_roles.name`, but the UI also allows custom free-text duties.

Good duty examples:

- `Producer`
- `Camera 1`
- `Lighting`
- `Editor`
- `Camera 1 - main`

## Users And Roles

### `users`

Expected values:

- `name`: given name, not full name
- `surname`: family name
- `email`: valid login email

Why this matters:

- The UI constructs display names as `${name} ${surname}`.
- Avatar initials use the first character of `name` and `surname`.

### `roles`

Expected values:

- `name` should be human-readable, such as `admin`, `producer`, or `viewer`.
- Permission flags should be explicit booleans.

Permission semantics:

- `can_create`: can create records
- `can_read`: can view records
- `can_update`: can edit records
- `can_delete`: can remove records
- `can_manage_roles`: can administer role assignments or role definitions
- `can_manage_assignees`: can assign users to requests

Current implementation note:

- The app reads one role per user via `.single()` on `user_roles`.
- If the database actually allows multiple roles per user, the current app is not modeling that fully.

### Signup caveat

- The signup screen collects only `email` and `password`.
- No code in this repository creates the matching `users` profile row or `user_roles` row after signup.
- If those rows do not already exist, profile and role lookup will return `null`.

## Equipment

### `status`

Allowed values:

- `available`
- `booked`
- `booked_out`
- `maintenance`

Expected usage:

- `available`: item is available for assignment
- `booked`: reserved but not yet checked out
- `booked_out`: physically out in the field or with a user
- `maintenance`: not usable because it is being serviced or repaired

Recommended consistency:

- When `status` is `available` or `maintenance`, prefer `bookedBy: null`.
- When `status` is `booked` or `booked_out`, prefer `bookedBy` containing the responsible person’s name.

### `category`

Allowed values:

- `camera`
- `lens`
- `lighting`
- `audio`
- `support`
- `monitor`
- `cable`
- `accessory`

Expected usage:

- Choose the broad operational bucket, not a brand or department name.
- Keep it stable so filters and reports remain useful.

### `serialNumber`

- Use a real asset-tracking identifier where possible.
- The current mock data uses human-readable prefixes like `SN-CAM-001`.

### `location`

- Use a current physical or operational location.
- Examples from the existing data:
  - `Studio A`
  - `Storage Room B`
  - `Field`
  - `Repair Shop`

### `notes`

- Keep as a string.
- Use `""` when there is no note if you want to stay aligned with the current mock data.
- Use it for damage, maintenance context, or important handling notes.

### `thumbnail`

- Use a full URL when an image exists.
- Otherwise use `null`.

### `Booking.status`

Allowed values:

- `booked`
- `checked_out`
- `returned`

Expected usage:

- `booked`: reserved, not yet checked out
- `checked_out`: currently with a user/team
- `returned`: completed booking

Consistency rules:

- `returnedDate` should be `null` for `booked` and `checked_out`.
- `returnedDate` should be populated for `returned`.
- `expectedReturnAt` should be populated for every booking, including active and returned bookings.
- For active bookings, due-soon/overdue logic compares `expectedReturnAt` to the current time.
- `duration` is currently human-readable text, not a numeric day count.

## Broadcast

### `Playlist.status`

Allowed values:

- `draft`
- `published`

Expected usage:

- `draft`: playlist is still being prepared
- `published`: playlist is ready and immediately available for operational use

Current implementation notes:

- New playlists default to `draft`.
- The list and drawer toggle between `draft` and `published`.

### `Playlist.name` and `description`

- `name` should be short and operationally recognizable.
- `description` can be empty, but a sentence of context is better for shared playlists.

Good examples:

- `Sunday Service`
- `Youth Service`
- `Midweek Prayer`

### `Cue`

Expected values:

- `order` should be a contiguous 1-based sequence.
- `mediaItemId` should point to an existing media item.
- `mediaItemName` and `mediaItemType` should match the referenced media item at the time the cue is created.
- `durationOverride` should be:
  - `null` to inherit the media item duration
  - a positive number of seconds to force a custom duration

Operational note:

- Cue fields intentionally duplicate media name and type for display convenience.
- If a media item is renamed later, existing cues may need resync if strict consistency matters.

### `MediaItem.type`

Allowed values:

- `image`
- `audio`
- `video`
- `slide`

### Media-by-type expectations

#### `image`

- `url`: required image URL
- `thumbnail`: optional, but recommended
- `duration`: `null`
- `slides`: `null`
- `audioUrl`: `null`

#### `audio`

- `url`: required audio URL
- `thumbnail`: usually `null`
- `duration`: positive number of seconds
- `slides`: `null`
- `audioUrl`: `null`

#### `video`

- `url`: required video URL
- `thumbnail`: recommended
- `duration`: positive number of seconds
- `slides`: `null`
- `audioUrl`: `null`

#### `slide`

- `url`: currently `""` in mock data
- `thumbnail`: recommended preview image
- `duration`: `null`
- `slides`: non-empty array of slide images
- `audioUrl`: optional overlay track

This is an important current convention:

- The schema allows `slide`, but the current upload UI does not create slide items.
- Slide media exists only in seeded mock data right now.

### `SlideImage.duration`

- Use seconds as an integer.
- Each slide can have its own duration even when the parent media item has `duration: null`.

### Upload flow caveat

The current media upload modal creates new items like this:

- `image`:
  - `duration: null`
- `video` and `audio`:
  - `duration: 0`

That means:

- `0` is currently used as a placeholder value for newly created non-image uploads.
- If downstream logic expects a real runtime duration, replace `0` with the actual duration after ingestion.

## Cue Sheet

### `CueSheetEvent`

Expected usage:

- `title` should be short and operationally recognizable.
- `description` can be empty, but a concise sentence helps distinguish reusable event templates.
- `duration` is the full event timeline length in minutes.
- `createdAt` and `updatedAt` should remain ISO datetime strings.
- `kind: "template"` means the event is reusable.
- `kind: "instance"` means the event was created from a template and can be adjusted independently.
- `templateId` should be set only on instances created from a template.
- `scheduledAt` is optional for instances and should be an ISO datetime string when used.

Good examples:

- `Sunday Service`
- `Wednesday Bible Study`
- `Youth Night`

### `Checklist`

Expected usage:

- `name` should describe the preparation flow, such as `Sunday Service Prep`.
- `items` contains ungrouped tasks shown before any sections.
- `sections` contains grouped tasks and should be an empty array when no grouping is needed.
- Use `checked: false` for newly created checklist items.
- `kind: "template"` means the checklist is reusable.
- `kind: "instance"` means the checklist was created from a template and can be checked off independently.
- `templateId` should be set only on instances created from a template.
- `scheduledAt` is optional for instances and should be an ISO datetime string when used.

### `ChecklistSection`

- `name` should be a team, phase, or operational grouping.
- `items` should stay as an array, even when empty.
- Section and item ordering is represented by array order.

### Cue-sheet timeline `Track`

- Tracks are stored under their owning event id in `src/data/mock/cue-sheet-tracks.json`.
- `name` should identify the lane, such as `Audio`, `Visuals`, `Livestream`, or `Stage`.
- `color` is a CSS color string used by the timeline UI.
- Track ordering is represented by array order.

### Cue-sheet timeline `Cue`

Allowed `type` values:

- `performance`
- `technical`
- `equipment`
- `announcement`
- `transition`

Timing rules:

- `startMin` is the offset from the start of the event.
- `durationMin` is the cue length in minutes.
- Keep both values numeric so timeline drag, resize, and marker calculations remain stable.
- Cue ordering within a track is represented by array order and visual position.
- `assignee` is optional free text for the person responsible for a specific cue.

## Cross-Domain Practical Rules

### Prefer enums exactly as defined

Do not use display labels as stored values.

Use:

- `not_started`
- `booked_out`
- `video_production`

Do not use:

- `Not Started`
- `Booked Out`
- `Video Production`

### Store human-readable labels only where the model already does it

Examples of denormalized text fields that are intentionally human-readable:

- `Booking.equipmentName`
- `Booking.bookedBy`
- `Cue.mediaItemName`
- `Role.name`

### Keep formats stable

- Datetime comparisons in the app rely on `new Date(...)`.
- Avoid storing loose text like `tomorrow morning` or `next week` in fields that are already typed as dates.
- Use the free-text fields for narrative descriptions, not typed/date fields.

## Current Implementation Gaps

- Equipment save/delete calls are mock-only.
- Broadcast save/delete/update calls are mock-only.
- Cue-sheet save/delete/update calls are mock-only.
- Playlists are embedded objects with nested cues, not normalized DB rows in the current implementation.
- Cue-sheet checklists and timeline tracks are embedded mock JSON structures, not normalized DB rows in the current implementation.
- Request data is normalized enough to infer real tables:
  - `requests`
  - `request_assignees`
  - `request_roles`
  - `users`
  - `user_roles`
  - `roles`

If the repository later adds migrations or generated database types, this guide should be updated to match them exactly.
