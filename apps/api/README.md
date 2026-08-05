# MOC API

Every server-side function on the MOC platform. Deployed as its own Vercel
project at `api.psape.co.zw`; MOC Console and MOC Request ship no server code
and hold no server secrets.

See [ADR-0008](../../docs/adr/0008-extract-moc-api-app.md) for why this exists.

## Endpoints

| Path | Caller | Auth |
| --- | --- | --- |
| `POST /api/notify/request` | MOC Request (browser) | stored request ID + tracking code |
| `POST /api/notify/booking` | MOC Request (browser) | stored booking ID + tracking code |
| `POST /api/notifications/requests` | external senders | HMAC `X-Signature` |
| `POST /api/notifications/bookings` | external senders | HMAC `X-Signature` |
| `POST /api/notifications/assignment` | MOC Console (browser) | Supabase session (`x-moc-session`) |
| `POST /api/notifications/internal/stream-created` | MOC Console (browser) | Supabase session |
| `POST /api/notifications/internal/meeting-created` | MOC Console (browser) | Supabase session |
| `POST /api/youtube/oauth/{exchange,refresh,revoke}` | MOC Console (browser) | Supabase session + workspace permission |
| `* /api/youtube/v3/*` | MOC Console (browser) | Supabase session + workspace permission |
| `POST /api/zoom/oauth/{exchange,refresh,revoke}` | MOC Console (browser) | Supabase session |
| `* /api/zoom/v2/*` | MOC Console (browser) | Supabase session + workspace permission |
| `POST /api/telegram/webhook` | Telegram | webhook secret |
| `GET /api/cron/weekly-archive` | Vercel Cron, Mondays 00:00 | `CRON_SECRET` |
| `GET /api/cron/stale-items` | Vercel Cron, daily 00:00 | `CRON_SECRET` |
| `GET /api/cron/notification-deliveries` | Vercel Cron, daily 01:00 fallback retry | `CRON_SECRET` |

Request and booking database triggers create durable notification-outbox rows in
the same transaction as the source write. The Request PWA can best-effort wake
the pending created event by presenting the returned record ID and tracking code;
it cannot inject a workspace, destination, or message payload. Signed external
endpoints have the same record-derived boundary.

## Destination overrides

The two `internal/*-created` endpoints accept an optional `destinations`
array of `{ groupChatId, threadId }`. When present and non-empty it **replaces**
the workspace's configured `notification_routes` for that one notification, and
works even when no route is configured for the event.

Destinations come from a browser, so `dispatchEvent` re-validates every one
against `telegram_groups` for that workspace: the group must be active and not
removed, and a non-null `threadId` must name an existing, open topic on it.
Anything else is dropped. If every requested destination fails validation the
dispatcher logs a delivery failure rather than failing silently — the caller
explicitly asked for delivery, so silence would look like the notification
vanished.

An override changes *where* a notification goes, never *what it says*: the
template and token rendering are identical either way.

## CORS

Browser calls arrive cross-origin and carry a session plus workspace context in
headers (`x-moc-session`, `x-moc-workspace`), so `ALLOWED_ORIGINS` is an exact allow-list
and the API echoes the caller's origin — never `*`. Unset means no browser
origin is allowed. Telegram and Vercel Cron send no `Origin` and are unaffected.

**Deploy the API with both frontend origins listed before pointing the
frontends at it**, or every call fails preflight.

## Environment

See [.env.example](.env.example). Nothing here is `VITE_`-prefixed; no value in
this app is ever shipped to a browser.

One trap worth knowing: `resolveBaseUrl()` does **not** fall back to
`VERCEL_URL`. On this project that is the API's own host, and a "View request"
link built from it would 404. Set `CONSOLE_BASE_URL` or link-bearing
notifications are skipped.

## Local development

```bash
bun run dev:api
```

Runs `vercel dev` on port 3001. Point a frontend at it by setting
`VITE_API_BASE_URL=http://localhost:3001` in that app's `.env.local`, and add
`http://localhost:5173` to `ALLOWED_ORIGINS` here.

Only work that touches Zoom, YouTube or notifications needs the API running.
Requests, equipment and bookings go straight to Supabase from the browser.

## Layout

```
api/         deployable Vercel entrypoints; related routes share dynamic routers
public/      minimal static output required by Vercel's Other preset
server/      handlers and shared library: supabase-admin, auth-guard, cors, http,
             telegram, zoom/youtube oauth, notifications/{dispatch,enrich,…}
```

`server/http.ts` holds the `ApiRequest`/`ApiResponse` shapes every handler is
written against, plus `headerValue`/`normaliseHeaders`. The message templates
themselves live in `@moc/notifications`, shared with the console's settings UI.
