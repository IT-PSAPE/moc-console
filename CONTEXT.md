# MOC Platform

The MOC platform is three deployments sharing one Supabase backend: an authenticated admin console for staff, a public PWA for end users to submit and track requests, and a headless API that owns every server-side function for both.

## Language

**MOC Console**:
The authenticated, workspace-scoped admin app used by staff to manage requests, equipment, bookings, streams, and integrations (Zoom, YouTube, Telegram).
_Avoid_: "admin app", "the dashboard", "the platform"

**MOC Request**:
The public, anonymous PWA where end users submit booking and culture requests and look up the status of an existing request by tracking code.
_Avoid_: "the request portal", "the public site"

**MOC API**:
The headless third deployment (`apps/api`, api.psape.co.zw). It owns every serverless function on the platform — Telegram webhook and dispatch, YouTube and Zoom OAuth, the Zoom REST proxy, notification ingest, and the scheduled jobs — plus the `server/` library behind them. Neither frontend ships server code, and no server secret is configured on a frontend project.
_Avoid_: "the backend" (Supabase is also a backend); "the notification service" (it is not only notifications).

**Requests portal**:
A feature *inside* MOC Console for staff to view and act on requests submitted via MOC Request. Distinct from the MOC Request app itself.

**Archive**:
Not a feature — a *filter*. Archived requests are hidden from the Requests page by default and appear when "Archived" is ticked in its status filter. There is no archive route, screen or sidebar item.
_Avoid_: "the archive page"; treating archived bookings as part of it — a Booking's `archived` status belongs to the Bookings feature.

**Streams**:
The MOC Console feature for YouTube live streams and Zoom meetings — creating them, syncing their state from the provider, and holding the workspace-level OAuth connections. The only broadcast-adjacent feature that remains.
_Avoid_: "Broadcast" / "Broadcasts section" — that area was removed (see Removed features).

**Notification route**:
A workspace-level rule in Settings binding one notification event to one Telegram destination. An event with no route sends nothing. Many routes per event are allowed.

**Destination override**:
A per-creation choice of Telegram destinations, made in the stream or meeting modal. A non-empty override **replaces** the event's **Notification routes** for that one notification — it does not add to them — and works even when the event has no route at all. An empty override means the routes decide, including deciding to send nothing.
_Avoid_: "notification settings override" (it overrides routing, not templates or format); treating it as an extra recipient list.

**Workspace**:
A tenancy boundary inside MOC Console. Every authenticated console operation is scoped to a workspace; users belong to one or more workspaces.
_Avoid_: "tenant", "org", "account"

**Public flow**:
An anonymous operation from MOC Request: against Supabase — submit a booking, submit a request, look up a request by tracking code, fetch the public equipment catalogue — or against **MOC API**'s unauthenticated `/api/notify/*`, to announce a submission.

**Authenticated flow**:
A workspace-scoped operation from MOC Console requiring a signed-in user: managing assignees, streams, telegram routes, zoom credentials, workspace members, etc. **MOC Console does not create Requests or Bookings** — those are created exclusively by end users via MOC Request. The console can only view, edit, and act on what was submitted.

**Tracking code**:
The opaque identifier given to an end user after submitting a request, used in MOC Request's lookup flow to retrieve status.

**Booking**:
A single submission made via MOC Request to reserve one or more pieces of **Equipment** for a date range. Identified by one **Tracking code** and a user-supplied **title**. Carries the entire batch-level state: who booked it, the date range, notes, lifecycle status, and the single moment of return. A Booking is checked out and returned **as one unit** — items are never returned individually.
_Avoid_: calling a per-equipment row a "booking" — that is a [[booking-item]].

**Booking item**:
The link between a **Booking** and one piece of **Equipment** it reserves. Carries no lifecycle of its own — status and returned-at live on the parent [[booking]]. A Booking with N equipment ids has N booking items.
_Avoid_: "booking row"; treating an item as separately returnable.

**Maintenance**:
An **Equipment** status (`maintenance`), surfaced as a filter on the Equipment page. Not a feature, screen, or route of its own.
_Avoid_: "the maintenance page"

## Relationships

- A **Workspace** owns many **Requests**, **Bookings**, **Equipment**, **Checklists**, and **Streams**.
- A **Request** is created via a **Public flow** (MOC Request) and managed via the **Requests portal** (MOC Console); once archived it stays on the same page, behind the status filter.
- **MOC Console** and **MOC Request** share the same Supabase project; RLS distinguishes **Public flow** access from **Authenticated flow** access.
- Both frontends reach **MOC API** by absolute URL (`VITE_API_BASE_URL`), so every browser call to it is cross-origin and gated by that app's `ALLOWED_ORIGINS` allow-list.

## Console navigation

The sidebar is flat — one item, one destination, no expand/collapse and no section landing pages:

| Item | Route | Content |
| --- | --- | --- |
| Dashboard | `/dashboard` | Requests + equipment summary |
| Requests | `/requests` | All submitted requests; archived ones behind the status filter |
| Equipment | `/equipment` | Full inventory, filterable by status incl. maintenance |
| Bookings | `/bookings` | Equipment bookings |
| Checklists | `/checklists` | Active and completed checklist runs; reusable templates at `/checklists/templates` |
| Streams | `/streams` | YouTube streams and Zoom meetings |

Two things that read like features but are filters: **Archive** (a request status) and **Maintenance** (an equipment status).

## Removed features

Removed 2026-07-28. Kept here so the terms are recognised as *gone*, not merely undocumented — do not reintroduce them without a new ADR.

- **Broadcasts section** — the Console playlist authoring area (playlist editor, media library). Removed with its `playlists`, `playlist_lanes`, `queue` and `media` tables.
- **MOC Broadcast** — the public player app (`apps/broadcast`) and the shared playback engine (`@moc/player`). Nothing plays playlists any more.
- **Cue Sheet (QSheets)** — events, tracks, cues, public event shares and playhead sync. Checklists were restored as a standalone feature on 2026-07-31; see [ADR-0009](./docs/adr/0009-restore-checklists-as-standalone-feature.md).
- **Timeline** — the shared domain-agnostic time-axis primitive, along with **Lane**, **Block**, **Transport**, **Program** and **Playhead**. It existed only to serve the two domains above.
- **Media library** — the `media` table. The `media` *storage bucket* is retained: stream thumbnails still upload to it under `<workspace_id>/stream-thumbnails/`.
- **Maintenance page** — folded into the Equipment page's status filter.
- **Archive page** — folded into the Requests page's status filter (removed 2026-07-28, after briefly existing as its own route).
- Section **overview pages** for Requests, Equipment, Broadcast and Cue Sheet — the flat sidebar has no section landings.
- **Per-frontend server code** — `apps/console/api`, `apps/console/server` and `apps/request/api` all moved to **MOC API**. See [ADR-0008](./docs/adr/0008-extract-moc-api-app.md).

See [ADR-0007](./docs/adr/0007-simplify-console-to-five-features.md) and [`supabase/patches/2026-07-28-remove-playlists-media-and-cue-sheet.sql`](./supabase/patches/2026-07-28-remove-playlists-media-and-cue-sheet.sql).

## Flagged ambiguities

- "MOC Request" used to refer to both the standalone public app *and* the Requests feature inside Console. Resolved: **MOC Request** = the public PWA; **Requests portal** = the feature in MOC Console.
- Design primitives (button, input, base CSS tokens) drifted between the two apps after the original split. Resolved (2026-05-15): **MOC Console**'s primitives are canonical; MOC Request adopts them via shared `@moc/ui`. See [ADR-0001](./docs/adr/0001-reunify-moc-request-as-monorepo.md).
- "Broadcast" was overloaded across the Console authoring section, the act of publishing, and the public player app. Resolved (2026-07-28) by deletion: none of those exist. The word now only appears where YouTube's own API uses it (`liveBroadcasts`, `youtube_broadcast_id`) — that is a vendor term, not a domain one. See [ADR-0007](./docs/adr/0007-simplify-console-to-five-features.md).
- "Cue" and "Track" were used in two unrelated domains (Cue sheet vs playlists). Resolved (2026-07-28) by deletion: both domains are gone, and so is the shared Timeline primitive that reconciled them.
- "Booking" was overloaded: the user-level submission (1 tracking code, N equipment) vs. a per-equipment DB row. Resolved (2026-05-27): **Booking** is the submission (header); **Booking item** is the per-equipment row. Schema split into header + items table. See [ADR-0006](./docs/adr/0006-booking-as-batch.md).
