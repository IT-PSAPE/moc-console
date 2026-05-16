# MOC Platform

The MOC platform is split across three user-facing apps that share a Supabase backend: an authenticated admin console for staff, a public PWA for end users to submit and track requests, and a public player that broadcasts published playlists.

## Language

**MOC Console**:
The authenticated, workspace-scoped admin app used by staff to manage requests, broadcasts, cue sheets, equipment, streams, and integrations (Zoom, YouTube, Telegram).
_Avoid_: "admin app", "the dashboard", "the platform"

**MOC Request**:
The public, anonymous PWA where end users submit booking and culture requests and look up the status of an existing request by tracking code.
_Avoid_: "the request portal", "the public site"

**Requests portal**:
A feature *inside* MOC Console for staff to view and act on requests submitted via MOC Request. Distinct from the MOC Request app itself.

**MOC Broadcast**:
The public, anonymous app where a viewer chooses a workspace and plays one of its *published* playlists (continuous loop; foyer/auditorium display). Workspace is chosen at runtime (no login, no baked workspace) and its id is carried in the URL path.
_Avoid_: "the broadcast app" as a synonym for the Console section below; "the player".

**Broadcasts section**:
The playlist *authoring* area *inside* MOC Console (playlist editor, media library, stream integrations). Despite the name it does not play anything — playback happens in MOC Broadcast. Distinct from the MOC Broadcast app.

**Published playlist**:
A playlist with `status = 'published'`. This is the sole gate that makes a playlist publicly playable via MOC Broadcast. A `draft` playlist is invisible to MOC Broadcast.

**Broadcasting**:
The act of making a playlist publicly playable (i.e. publishing it so MOC Broadcast can play it). A verb, not an entity — there is no `Broadcast` record; the thing played is a `Playlist`.

**Workspace**:
A tenancy boundary inside MOC Console. Every authenticated console operation is scoped to a workspace; users belong to one or more workspaces.
_Avoid_: "tenant", "org", "account"

**Public flow**:
An anonymous operation against Supabase from a public app. From MOC Request: submit a booking, submit a request, look up a request by tracking code, fetch the public equipment catalogue, send a notification event. From MOC Broadcast: list workspaces (anon RPC), read published playlists and their media.

**Authenticated flow**:
A workspace-scoped operation from MOC Console requiring a signed-in user: managing assignees, broadcasts, streams, telegram routes, zoom credentials, workspace members, etc.

**Tracking code**:
The opaque identifier given to an end user after submitting a request, used in MOC Request's lookup flow to retrieve status.

## Relationships

- A **Workspace** owns many **Requests**, **Bookings**, **Broadcasts**, **Cue sheets**, and **Equipment**.
- A **Request** is created via a **Public flow** (MOC Request) and managed via the **Requests portal** (MOC Console).
- A **Workspace**'s **Published playlists** are playable by anyone via **MOC Broadcast**; `draft` playlists are not.
- **MOC Console**, **MOC Request**, and **MOC Broadcast** share the same Supabase project; RLS distinguishes **Public flow** access from **Authenticated flow** access.

## Flagged ambiguities

- "MOC Request" used to refer to both the standalone public app *and* the Requests feature inside Console. Resolved: **MOC Request** = the public PWA; **Requests portal** = the feature in MOC Console.
- Design primitives (button, input, base CSS tokens) drifted between the two apps after the original split. Resolved (2026-05-15): **MOC Console**'s primitives are canonical; MOC Request adopts them via shared `@moc/ui`. See [ADR-0001](./docs/adr/0001-reunify-moc-request-as-monorepo.md).
- "Broadcast" was overloaded: the Console authoring section, the act of publishing, and the new public app. Resolved (2026-05-16): **MOC Broadcast** = the public player app; **Broadcasts section** = the Console authoring area; **Broadcasting** = the verb; no `Broadcast` entity. See [ADR-0002](./docs/adr/0002-moc-broadcast-public-player.md).
- Audio is still a queueable cue type, but the long-term intent is audio-as-background-music only. Deferred, not yet resolved — the MOC Broadcast player tolerates audio cues with a minimal visual. See [ADR-0002](./docs/adr/0002-moc-broadcast-public-player.md).
