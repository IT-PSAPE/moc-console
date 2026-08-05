# Extract every server-side function into a dedicated MOC API app

Server-side code was split across two frontends. MOC Console carried `api/` (14 Vercel functions: Telegram webhook, YouTube and Zoom OAuth, a Zoom REST proxy, notification ingest, two cron jobs) plus a `server/` library, and MOC Request carried two more functions whose only job was to HMAC-sign a payload and forward it to the console. Neither app's `tsconfig` included those folders, so none of it was ever typechecked. We are moving all of it into a third Vercel project, `apps/api` (**MOC API**), deployed at `api.psape.co.za`.

## Considered options

- **Leave the handlers where they are.** Rejected: it is the status quo the change exists to fix. Server secrets sat in the same project as a browser bundle, the console's `vite.config.ts` had to re-implement the Zoom proxy as dev middleware to make OAuth work locally, and MOC Request paid a network hop plus an HMAC dance to reach code it could have called directly.
- **Same-origin `/api/*` rewrites from each frontend to the API deployment.** Rejected by the user in favour of a real API domain. Rewrites would have avoided CORS entirely and needed no client changes, but they hide the API behind two other hosts and make its own domain unusable.
- **One shared package of handler logic, still deployed from both frontends.** Rejected: it dedupes the code but not the deployment. Both projects would still need every server secret, and the cron jobs would still be pinned to the console.
- **Fold the notification template engine into `@moc/types`.** Rejected: `renderTemplate` and the token catalogue are behaviour, not types, and `@moc/types` is imported by every app. A dedicated `@moc/notifications` keeps the dependency honest — the API app takes it, MOC Request does not.

## Decision

- **`apps/api` owns every serverless function and the `server/` library.** MOC Console and MOC Request ship no server code at all. Their `.env` files contain only `VITE_*` values, so a leaked frontend env leaks nothing.
- **Browsers call the API by absolute URL.** `VITE_API_BASE_URL` (e.g. `https://api.psape.co.za`) is joined to each path by `apiUrl()` in `@moc/utils`. Unset, it falls back to a relative path and the pre-split same-origin behaviour — so a missing env var degrades instead of producing `undefined/api/…`.
- **CORS is an explicit allow-list.** `ALLOWED_ORIGINS` names the exact console and request origins; the API echoes the caller's origin rather than replying `*`, because these requests carry credentials in headers (`x-moc-session`, `authorization`). Unset allows no browser origin. Server-to-server callers (Telegram, Vercel Cron) send no `Origin` and are unaffected. Every browser-facing handler answers `OPTIONS`.
- **The notify hop collapses.** `/api/notify/{request,booking}` now call `dispatchEvent` directly instead of HMAC-signing and re-entering the same deployment over HTTP. Those endpoints were always public and unauthenticated — that has not changed. `/api/notifications/{requests,bookings}` keep their HMAC check for genuinely external senders.
- **`@moc/notifications` is a new shared package** holding the template engine and event catalogue, imported by the API (to render and send) and by the console's settings UI (to preview and edit).
- **The API app is typechecked.** `apps/api/tsconfig.json` covers `api/` and `server/` under `nodenext`, so the `.js` import specifiers the runtime needs stay resolvable. This immediately surfaced a latent bug in `fetchYouTubeChannel`, which indexed an untyped `response.json()` and would have thrown on a malformed Google response instead of reporting "no channel found".
- **Console deep links need an explicit origin.** `resolveBaseUrl()` no longer falls back to `VERCEL_URL`: in this app that is the API's own host, and every notification link built from it would 404. `CONSOLE_BASE_URL` is canonical; `APP_BASE_URL` and `MOC_CONSOLE_BASE_URL` are still read so an existing deployment keeps working until its env vars are renamed.

## Consequences

- **Three Vercel projects.** The API project needs `rootDirectory = apps/api`, no build step, and the env vars in `apps/api/.env.example`. Cron schedules moved to its `vercel.json` — delete them from the console project or the jobs fire twice.
- **Local dev needs the API running** for anything that touches Zoom, YouTube or notifications: `bun run dev:api` (port 3001) plus `VITE_API_BASE_URL=http://localhost:3001` in the frontend's `.env.local`. The console's dev-only Zoom middleware is gone — it duplicated the real handlers. Pure Supabase work (requests, equipment, bookings) needs no API at all.
- **Ordering matters at deploy.** The frontends must not be pointed at the API domain before `ALLOWED_ORIGINS` includes them, or every call fails preflight. Deploy the API first with both origins listed, then the frontends.
- The console's CSP `connect-src` now includes `https://api.psape.co.za`.
- Both frontends keep working with `VITE_API_BASE_URL` blank as long as something serves `/api/*` on their origin — which is how the relative-path fallback earns its keep during the cutover.
