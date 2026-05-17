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

### Timeline

**Timeline**:
The shared, domain-agnostic time-axis surface used to author and play back time-positioned content. Used by both the Cue sheet (events) and the Broadcasts section (playlists).

**Lane**:
A horizontal row within a **Timeline**. The neutral, primitive-level term. A Cue-sheet **Track** is a Lane; a playlist's media row is a Lane. A Lane carries a domain-defined *type* that the Timeline stores but never interprets; the composer decides how Blocks look per type.
_Avoid_: "track" or "row" when referring to the primitive concept.

**Transport**:
The domain-supplied time source that drives a **Timeline**'s **Playhead**. A Cue sheet supplies a clock transport (ticker + controller/follower sync); a playlist supplies an *authoritative master clock* that all media subscribe to and follow — the clock never follows the media.

**Program**:
The single composited visual output of a playlist at the **Playhead** — every **Lane**'s active **Block** alpha-composited front-to-back by Lane order, **Lane 01 frontmost**. What a MOC Broadcast viewer sees, and what the Console preview mirrors.
_Avoid_: "scene", "the stage", "the screen"

**Block**:
A single time-positioned item (a start + a duration) inside a **Lane**. The neutral, primitive-level term. A Cue-sheet **Cue** is a Block; a playlist media item is a Block.
_Avoid_: "cue" when referring to the primitive concept.

**Playhead**:
The current-time indicator on a **Timeline**; can be scrubbed. Its motion is driven by a domain-supplied transport, not by the Timeline itself.

**Track** (Cue sheet):
A named lane in a Cue sheet (e.g. Stage, AV) that groups **Cues** for one event. A domain mapping of **Lane**.

**Cue** (overloaded — see Flagged ambiguities):
In the Cue sheet: a time-boxed event segment (`startMin`, `durationMin`, type). In the Broadcasts section: a media item in a playlist. Both are domain mappings of **Block**.

## Relationships

- A **Workspace** owns many **Requests**, **Bookings**, **Broadcasts**, **Cue sheets**, and **Equipment**.
- A **Request** is created via a **Public flow** (MOC Request) and managed via the **Requests portal** (MOC Console).
- A **Workspace**'s **Published playlists** are playable by anyone via **MOC Broadcast**; `draft` playlists are not.
- **MOC Console**, **MOC Request**, and **MOC Broadcast** share the same Supabase project; RLS distinguishes **Public flow** access from **Authenticated flow** access.
- A playlist's **Lanes** composite into the **Program** front-to-back by Lane order: **Lane 01** is frontmost (highest priority); opaque pixels occlude lanes behind, transparent pixels and gaps let them show through. Audio lanes only mix sound — they never contribute to the **Program**.
- The **MOC Broadcast** player and the Console **Broadcasts section** preview render the same **Program** from one shared playback engine, so authoring and playback look identical.

## Flagged ambiguities

- "MOC Request" used to refer to both the standalone public app *and* the Requests feature inside Console. Resolved: **MOC Request** = the public PWA; **Requests portal** = the feature in MOC Console.
- Design primitives (button, input, base CSS tokens) drifted between the two apps after the original split. Resolved (2026-05-15): **MOC Console**'s primitives are canonical; MOC Request adopts them via shared `@moc/ui`. See [ADR-0001](./docs/adr/0001-reunify-moc-request-as-monorepo.md).
- "Broadcast" was overloaded: the Console authoring section, the act of publishing, and the new public app. Resolved (2026-05-16): **MOC Broadcast** = the public player app; **Broadcasts section** = the Console authoring area; **Broadcasting** = the verb; no `Broadcast` entity. See [ADR-0002](./docs/adr/0002-moc-broadcast-public-player.md).
- Audio is still a queueable cue type, but the long-term intent is audio-as-background-music only. Deferred, not yet resolved — the MOC Broadcast player tolerates audio cues with a minimal visual. See [ADR-0002](./docs/adr/0002-moc-broadcast-public-player.md). Multi-track playlists (audio as a parallel background **Lane**) are the intended resolution path.
- "Cue" and "Track" are used in two unrelated domains (Cue sheet vs Broadcasts/playlist) with different data shapes. Resolved (2026-05-16) at the primitive level: the shared **Timeline** speaks only **Lane** and **Block**; each domain maps its own `Track`/`Cue` onto them. The domain `Cue` types are *not* unified.
- **Transport** for a playlist was defined as "the playing media is the clock" (per ADR-0003). Resolved (2026-05-16): a playlist uses an **authoritative master clock**; media are reconciling *subscribers* that follow it (soft catch-up), the clock never follows media. Supersedes that part of ADR-0003 for the playlist domain — see [ADR-0005](./docs/adr/0005-unified-playlist-playback-engine.md).
- **Lane** z-order was modelled base-lane-at-the-back (ADR-0004: lane order = bottom-up z-stack). Resolved (2026-05-16): **Lane 01 is frontmost**; the **Program** is an alpha composite front-to-back by lane number. Amends ADR-0004 — see [ADR-0005](./docs/adr/0005-unified-playlist-playback-engine.md).
