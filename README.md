# MOC Console

MOC Console is a React 19 admin application for managing operational workflows across:

- requests (archived ones behind a filter)
- equipment inventory
- equipment bookings
- checklist runs and reusable templates
- YouTube streams and Zoom meetings
- continuously looping public audio and video broadcasts
- authenticated users and role-aware navigation

The UI is built with React, TypeScript, Vite, and Tailwind CSS v4.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- MoC SDK and API on Vercel; PostgreSQL, authentication, storage and workers in Neon

## Feature Areas

Navigation is flat: one sidebar item per feature, no nested sections.

### Requests

- all submitted requests
- request detail view
- request assignees and request duty roles

### Equipment

- full inventory (list, table and kanban views)
- status filter, including items in maintenance
- equipment detail view with QR and notes

### Bookings

- equipment bookings (list, table and calendar views)
- booking detail view with scan-based checkout and return

### Checklists

- active and completed checklist runs
- reusable checklist templates
- item grouping, ordering, completion, and assignments

### Streams

- YouTube live streams
- Zoom meetings
- stream and meeting detail views

## Authentication

The apps use `@moc/sdk` through same-origin `/api/*` rewrites. The API validates
host-only HttpOnly sessions backed by Better Auth running in a Neon Function.
User UUIDs and bcrypt password hashes are preserved during import; existing
sessions must sign in again. Signup still creates a pending workspace request.

Configure each app from its `.env.example`; browser bundles have no database,
auth-provider or storage credentials. See [migration runbook](docs/vercel-neon-migration.md)
for server configuration, imports, verification and cutover gates.

## Getting Started

Install dependencies:

```bash
npm ci
```

Use Node.js 24 (24.13+) and npm 11 (11.12.1+). Run `nvm use` if you use nvm;
update npm with `npm install --global npm@11.12.1` when needed.

Start the dev server:

```bash
npm run dev:console
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Preview the production build:

```bash
npm run preview --workspace=moc-console
```

### Viewing a dev server from another device (Tailscale)

All three browser apps bind every network interface and accept MagicDNS hostnames,
so anything signed in to the same tailnet — a phone, a tablet, another laptop —
can open a running dev server with no tunnel and no public URL:

```bash
npm run dev:console     # http://<machine>.<tailnet>.ts.net:5173
npm run dev:broadcast   # http://<machine>.<tailnet>.ts.net:5174
npm run dev:request     # http://<machine>.<tailnet>.ts.net:5176
```

Each server prints its own tailnet URL alongside Vite's local one at startup.
Nothing is exposed to the public internet: MagicDNS names only resolve for
devices already authenticated to the tailnet, and the allow-list is limited to
`.ts.net`.

The behaviour lives in [scripts/vite-tailscale.ts](scripts/vite-tailscale.ts)
and is shared by all three apps. If Tailscale is not installed, not running, or
logged out, the plugin stays quiet and the dev server starts as normal — it
just prints no tailnet line.

Note that these are plain HTTP origins. That is fine for looking at pages, but
a browser will not install the request app as a PWA or grant a secure-context
API over one. Front it with `tailscale serve` if you need HTTPS on the tailnet.

## Database setup

The standalone Neon baseline is in `neon/database`, with MoC runtime roles,
authentication, storage metadata and domain routines. Run
`neon/database/build-fresh-database.sh` only against an empty destination.
Deployment and verification steps are in the
[deployment guide](docs/vercel-neon-migration.md).

Configure each app (`apps/console`, `apps/request`, `apps/broadcast`, `apps/api`) from its
`.env.example`. Frontends call the API through same-origin `/api/*` routes.
Local Vite servers use `MOC_API_PROXY_TARGET`. Server secrets live only in
`apps/api`.

**External integrations.** The schema is complete on its own. Optional
features — Telegram bot linking/notifications, YouTube and Zoom
streaming — additionally require their own credentials and external
services (bot token, OAuth apps); these are app/config concerns, not
database setup.

## Project Structure

The repo is an npm workspaces monorepo:

- `apps/console` — the authenticated admin app (this README)
- `apps/request` — the public submission PWA
- `apps/api` — every serverless function and the `server/` library behind it; see [apps/api/README.md](apps/api/README.md)
- `apps/broadcast` — the public continuous-playback audio/video app
- `packages/{ui,types,utils,sdk,backend,notifications}` — shared code
- `test/{apps,packages,scripts,neon}` — automated tests and fixtures, mirroring the source tree; see [test/README.md](test/README.md)

Run the full test suite with `npm test`, or the API suite with
`npm run test:api`. New tests belong in `test/`, outside production folders.

Inside a frontend app:

- `src/screens` for route-level screens
- `src/features` for domain-specific state and UI
- `src/components` for shared UI primitives and composed components
- `src/data` for SDK adapters and domain mappers
- `src/types` for domain models
- `src/lib` for app infrastructure such as the SDK singleton and auth context
- `docs` for project documentation

## Server data caching

Browser apps use TanStack Query with a separate in-memory QueryClient per app.
The shared `@moc/query` factory retains inactive queries for 30 minutes, with
no automatic retries for reads or mutations. Console policies live in
`apps/console/src/lib/console-query-policy.ts` and apply to both observed reads
and imperative cache-aware loads.

| Data | Freshness | Automatic refresh |
| --- | --- | --- |
| Telegram groups, member connections, event routes, Messages | 30 seconds | Every 30 seconds while their page/drawer is mounted and visible |
| Request discussions | 1 minute | Every 15 seconds while open and visible |
| Requests, checklists, bookings, calendar, streams, linked records | 1 minute | When stale on navigation, focus, or network reconnect |
| Settings, preferences, categories, venues, member types, YouTube playlists | 5 minutes | When stale on navigation, focus, or reconnect |
| YouTube categories | 1 hour | When stale on navigation, focus, or reconnect |
| Public request catalogs | 5 minutes | When stale on navigation, focus, or reconnect |
| Public venue availability | 15 seconds | Every 15 seconds while visible, plus booking mutation invalidation |
| Public broadcast player | 1 minute | Revision events, visibility return, and 60-second fallback refresh by stable ID |

Returning to a fresh query does not make another request. Returning to a stale
query displays cached data immediately while refreshing in the background.
Only reads without cached data block the page. Background failures preserve
the last successful data; `refreshError` is separate from initial-load errors.
Polling pauses in hidden tabs and ends when the page/drawer unmounts. Global
collection providers do not poll just because a page was visited previously.

Console features use `useWorkspaceResource` and `useWorkspaceDetail`. Keys include
the workspace and resource (plus the record ID for details); user preferences
and workspace directories include the user ID. Resource writes cancel stale
reads, update all observers, and refresh affected detail queries. Related mutation
invalidation refreshes calendar and linked-record aggregates after request/booking
changes, and Messages after group/member changes. Explicit retry/refresh actions
bypass freshness. Sign-out and
account replacement clear the entire console QueryClient. Keep form drafts and
interaction state local; authentication and bearer-code tracking stay fresh
rather than being reused from a shared cache.

## Data Model Documentation

Two documentation files describe the current codebase schema and expected values:

- [docs/schema-reference.md](/Users/Craig/Developer/Projects/moc-console/docs/schema-reference.md)
- [docs/value-guide.md](/Users/Craig/Developer/Projects/moc-console/docs/value-guide.md)

Use them together:

- `schema-reference.md` describes fields, types, nullability, relationships, and enum values.
- `value-guide.md` explains what values should actually be used in practice and calls out current implementation conventions.

The domain model remains the existing MoC model. Apps call typed SDK capabilities;
the API executes parameterized PostgreSQL operations in verified actor/workspace
transactions. Neon Functions own scheduled work, and private Neon object storage
is streamed through the API. Broadcast changes use durable database revisions
and an API SSE stream.

## Routing Summary

Protected routes are defined in [console-routes.ts](apps/console/src/screens/console-routes.ts).

Main app sections:

- `/requests`
- `/requests/:id`
- `/equipment`
- `/equipment/:id`
- `/bookings`
- `/bookings/:id`
- `/venues`
- `/venues/:id`
- `/broadcasts`
- `/checklists`
- `/checklists/templates`
- `/checklists/:id`
- `/streams`
- `/streams/stream/:id`
- `/streams/meeting/:id`

Auth routes:

- `/login`
- `/signup`
- `/reset-password`

## Notes For Contributors

- Follow the project rules in `AGENTS.md`.
- Reuse existing shared components before creating new feature-level UI.
- Keep business logic in hooks, services, and utilities rather than in presentational components.
- Match the current domain patterns before introducing new structure.
