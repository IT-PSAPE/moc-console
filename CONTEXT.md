# MOC Platform

The MOC platform is split across two user-facing apps that share a Supabase backend: an authenticated admin console for staff, and a public PWA for end users to submit and track requests.

## Language

**MOC Console**:
The authenticated, workspace-scoped admin app used by staff to manage requests, broadcasts, cue sheets, equipment, streams, and integrations (Zoom, YouTube, Telegram).
_Avoid_: "admin app", "the dashboard", "the platform"

**MOC Request**:
The public, anonymous PWA where end users submit booking and culture requests and look up the status of an existing request by tracking code.
_Avoid_: "the request portal", "the public site"

**Requests portal**:
A feature *inside* MOC Console for staff to view and act on requests submitted via MOC Request. Distinct from the MOC Request app itself.

**Workspace**:
A tenancy boundary inside MOC Console. Every authenticated console operation is scoped to a workspace; users belong to one or more workspaces.
_Avoid_: "tenant", "org", "account"

**Public flow**:
An anonymous operation against Supabase from MOC Request: submit a booking, submit a request, look up a request by tracking code, fetch the public equipment catalogue, send a notification event.

**Authenticated flow**:
A workspace-scoped operation from MOC Console requiring a signed-in user: managing assignees, broadcasts, streams, telegram routes, zoom credentials, workspace members, etc.

**Tracking code**:
The opaque identifier given to an end user after submitting a request, used in MOC Request's lookup flow to retrieve status.

## Relationships

- A **Workspace** owns many **Requests**, **Bookings**, **Broadcasts**, **Cue sheets**, and **Equipment**.
- A **Request** is created via a **Public flow** (MOC Request) and managed via the **Requests portal** (MOC Console).
- **MOC Console** and **MOC Request** share the same Supabase project; RLS distinguishes **Public flow** access from **Authenticated flow** access.

## Flagged ambiguities

- "MOC Request" used to refer to both the standalone public app *and* the Requests feature inside Console. Resolved: **MOC Request** = the public PWA; **Requests portal** = the feature in MOC Console.
- Design primitives (button, input, base CSS tokens) drifted between the two apps after the original split. Resolved (2026-05-15): **MOC Console**'s primitives are canonical; MOC Request adopts them via shared `@moc/ui`. See [ADR-0001](./docs/adr/0001-reunify-moc-request-as-monorepo.md).
