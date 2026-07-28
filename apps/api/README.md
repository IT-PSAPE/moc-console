# MOC API

Every server-side function on the MOC platform. Deployed as its own Vercel
project at `api.psape.co.zw`; MOC Console and MOC Request ship no server code
and hold no server secrets.

See [ADR-0008](../../docs/adr/0008-extract-moc-api-app.md) for why this exists.

## Endpoints

| Path | Caller | Auth |
| --- | --- | --- |
| `POST /api/notify/request` | MOC Request (browser) | none — public submission surface |
| `POST /api/notify/booking` | MOC Request (browser) | none — public submission surface |
| `POST /api/notifications/requests` | external senders | HMAC `X-Signature` |
| `POST /api/notifications/bookings` | external senders | HMAC `X-Signature` |
| `POST /api/notifications/assignment` | MOC Console (browser) | Supabase session (`x-moc-session`) |
| `POST /api/notifications/internal/stream-created` | MOC Console (browser) | Supabase session |
| `POST /api/notifications/internal/meeting-created` | MOC Console (browser) | Supabase session |
| `POST /api/youtube/oauth/{exchange,refresh}` | MOC Console (browser) | Supabase session |
| `POST /api/zoom/oauth/{exchange,refresh,revoke}` | MOC Console (browser) | Supabase session |
| `* /api/zoom/v2/*` | MOC Console (browser) | Supabase session + Zoom bearer |
| `POST /api/telegram/webhook` | Telegram | webhook secret |
| `GET /api/cron/weekly-archive` | Vercel Cron, Mondays 00:00 | `CRON_SECRET` |
| `GET /api/cron/stale-items` | Vercel Cron, daily 00:00 | `CRON_SECRET` |

`/api/notify/*` and `/api/notifications/*` reach the same dispatcher. The
difference is trust: the notify pair is the public, unauthenticated surface the
request PWA posts to; the notifications pair is the signed surface for senders
outside this repo.

## CORS

Browser calls arrive cross-origin and carry credentials in headers
(`x-moc-session`, `authorization`), so `ALLOWED_ORIGINS` is an exact allow-list
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
api/         one file per route, Vercel's file-system routing
server/      shared library: supabase-admin, auth-guard, cors, http,
             telegram, zoom/youtube oauth, notifications/{dispatch,enrich,…}
```

`server/http.ts` holds the `ApiRequest`/`ApiResponse` shapes every handler is
written against, plus `headerValue`/`normaliseHeaders`. The message templates
themselves live in `@moc/notifications`, shared with the console's settings UI.
