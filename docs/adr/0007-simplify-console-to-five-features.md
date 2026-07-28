# Simplify MOC Console to five features

MOC Console had grown four top-level sections — Requests, Equipment, Broadcast, Cue Sheet — each with an overview landing page and an expand/collapse group of sub-pages in the sidebar. Two of those sections (Broadcast playlists + media, and the Cue Sheet) were never adopted in practice, and they carried the heaviest machinery in the repo: a shared Timeline primitive, a playback engine package, a whole second public app, and roughly a third of the database schema. We are removing both domains outright and flattening navigation to five destinations: **Requests**, **Archive**, **Equipment**, **Bookings**, **Streams**.

## Considered options

- **Hide the unused sections behind a feature flag.** Rejected: the cost being paid is not the menu entry, it is the code — `@moc/player`, the Timeline primitive, `apps/broadcast`, sixteen DB tables, and the notification types that hang off them. A flag keeps every line of that alive and adds a branch to reason about.
- **Keep the Broadcasts section, drop only the Cue Sheet.** Rejected: playlists and media were the less-used of the two, and the media library's only remaining consumer was a thumbnail picker in the stream modal — a dependency worth one file-upload field, not a whole domain.
- **Keep the section overviews as landing pages under a flat sidebar.** Rejected: an overview page exists to introduce a group of sub-pages. With one destination per section there is no group to introduce, and the stats they showed (totals, overdue, faulty) already have a home on the Dashboard.
- **Keep the sidebar's expand/collapse capability for future use.** Rejected: unused nesting in a shared primitive is a standing invitation to re-nest. `Sidebar.MenuItem` now takes no children and renders no chevron; re-adding nesting is a deliberate act, not an accident.

## Decision

- **Five flat routes.** `/requests`, `/archive`, `/equipment`, `/bookings`, `/streams`, plus `/dashboard` and search above the divider. Each is one page. Detail routes hang off their section (`/requests/:id`, `/equipment/:id`, `/bookings/:id`, `/streams/stream/:id`, `/streams/meeting/:id`) and keep the parent item highlighted.
- **Bookings and Streams are top-level.** Bookings moved out from under `/equipment/*`; Streams moved out from under `/broadcast/*`. Both are peers of Equipment now, not children of it.
- **Maintenance is a filter, not a page.** The Equipment page is the inventory; `status = maintenance` is one value in the existing status filter. The separate maintenance route and its two list/table views are gone.
- **Archive is requests-only.** It reads the same `requests` table filtered to archived state. A Booking's `archived` status stays inside Bookings.
- **Delete, don't deprecate.** `apps/broadcast`, `packages/player`, `packages/ui`'s Timeline, the console's cue-sheet and playlist/media features, `@moc/types/cue-sheet`, and the playlist/media halves of `@moc/types/broadcast` (now `@moc/types/streams`) are removed from the tree. The DB drop is a checked-in patch — `docs/phases/patches/2026-07-28-remove-playlists-media-and-cue-sheet.sql` — applied by hand, not by the app.
- **The `media` storage bucket survives its table.** Stream thumbnails already upload to `media/<workspace_id>/stream-thumbnails/` and existing thumbnail URLs point there. Only `public.media`, the library index, is dropped. Old playlist objects are left in the bucket; purging them is separate and deliberate.
- **Stream thumbnails lose the media picker.** Upload and URL remain; the third "Media" tab went with the library. `ThumbnailSource.origin` narrows from `"file" | "url" | "media"` to `"file" | "url"`.
- **Cue and checklist assignment DMs are gone.** `assignment.cue` and `assignment.checklist_item` drop out of `DmMessageType`, the token catalogue, the default templates, the sample values, and the server's `enrichCue`/`enrichChecklistItem`. `assignment.request` is the only DM type left. The patch deletes any customised rows for the dead types.

## Consequences

- Anyone with a bookmark under `/broadcast/*`, `/cue-sheet/*`, `/equipment/bookings`, `/requests/all-requests` or `/requests/archived` lands on the catch-all and is redirected to login. No redirect shims were added — the audience is a small internal staff list and the old URLs have no external reach.
- The Vercel project for `apps/broadcast` should be deleted; the root `dev:broadcast` / `build:broadcast` scripts are gone.
- `@moc/types`'s `broadcast` folder is renamed `streams`, matching the one domain it still describes. YouTube's own vocabulary (`liveBroadcasts`, `youtube_broadcast_id`) is untouched — that is a vendor term.
- ADRs [0002](./0002-moc-broadcast-public-player.md), [0003](./0003-domain-agnostic-timeline-primitive.md), [0004](./0004-multi-track-playlist-model.md) and [0005](./0005-unified-playlist-playback-engine.md) are superseded by this one. They describe systems that no longer exist and are kept only as history.
- The `colors` table and `equipment_status`'s `maintenance` value stay. `colors` was always shared rather than track-owned, and maintenance is still a live equipment state.
