# Extract every server-side function into a dedicated MOC API app

Server-side code was split across the Console and Request frontends. The original extraction created a dedicated `apps/api` project (**MOC API**) for HTTP routes, provider integrations, notifications, and application operations. The current platform keeps that API boundary while Neon Functions execute authentication and scheduled background work. Browser bundles contain no database access or server secrets.

## Considered options

- **Leave server handlers in the frontends.** Rejected: frontend deployments should not carry server secrets or split application authorization across multiple deployments.
- **Same-origin `/api/*` rewrites from each frontend to the API deployment.** Rejected by the user in favour of a real API domain. Rewrites would have avoided CORS entirely and needed no client changes, but they hide the API behind two other hosts and make its own domain unusable.
- **A shared package deployed as frontend server code.** Rejected: it would keep server credentials and responsibilities in frontend deployments instead of establishing one API boundary.
- **Fold the notification template engine into `@moc/types`.** Rejected: `renderTemplate` and the token catalogue are behaviour, not types, and `@moc/types` is imported by every app. A dedicated `@moc/notifications` keeps the dependency honest — the API app takes it, MOC Request does not.

## Decision

- **MOC API owns application HTTP operations and `apps/api/server/`.** Console and Request ship no application server code. API handlers authenticate requests, validate explicit operations, authorize workspace access, and query Neon PostgreSQL through `@moc/backend`.
- **Frontends use the typed SDK through same-origin paths.** `@moc/sdk` sends domain operations to `/api/*`; Vercel and local Vite development route them to MOC API. Public Request submissions and tracking use named public operations rather than direct database access or generic query endpoints.
- **CORS is an explicit allow-list.** `ALLOWED_ORIGINS` names the exact Console, Request, and Broadcast origins. The API echoes an allowed origin instead of replying `*`, because browser requests use credentials. Server-to-server callers such as Telegram and Neon Functions send no browser origin. Browser-facing handlers answer `OPTIONS`.
- **The notification boundary is direct and transactional.** Public submission operations save the record and notification outbox event in one database transaction. The client may send a best-effort wake containing the returned record ID and tracking code; it cannot choose a workspace, destination, or message body.
- **`@moc/notifications` is a new shared package** holding the template engine and event catalogue, imported by the API (to render and send) and by the console's settings UI (to preview and edit).
- **The API app is typechecked.** `apps/api/tsconfig.json` covers its entrypoints and server modules under `nodenext`, so runtime `.js` import specifiers stay resolvable.
- **Console deep links need an explicit origin.** `resolveBaseUrl()` no longer falls back to `VERCEL_URL`: in this app that is the API's own host, and every notification link built from it would 404. `CONSOLE_BASE_URL` is canonical; `APP_BASE_URL` and `MOC_CONSOLE_BASE_URL` are still read so an existing deployment keeps working until its env vars are renamed.

## Consequences

- **Deploy MOC API and Neon Functions as separate server workloads.** The API Vercel project uses `rootDirectory = apps/api`; Neon owns authentication execution and scheduled workers. Production schedules stay disabled until cutover is explicitly enabled.
- **Local development routes through MOC API.** Start it with `npm run dev:api` on port 3001; each frontend's Vite proxy forwards same-origin `/api/*` requests to that server. All application operations, including requests, equipment, bookings, and venues, use this boundary.
- **Ordering matters at deploy.** The frontends must not be pointed at the API domain before `ALLOWED_ORIGINS` includes them, or every call fails preflight. Deploy the API first with both origins listed, then the frontends.
- The console's CSP `connect-src` now includes `https://api.psape.co.za`.
- Same-origin `/api/*` paths keep frontend transport independent of deployment hostnames; the Vite and Vercel routing configuration selects the API target.
