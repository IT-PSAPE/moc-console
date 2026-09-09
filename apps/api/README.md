# MOC API

Every server-side function on the MOC platform. Deployed as its own Vercel
project at `api.psape.co.za`; MOC Console and MOC Request ship no server code
and hold no server secrets.

See [ADR-0008](../../docs/adr/0008-extract-moc-api-app.md) for why this exists.

## Endpoints

| Path | Caller | Auth |
| --- | --- | --- |
| `POST /api/notify/request` | MOC Request (browser) | stored request ID + tracking code |
| `POST /api/notify/booking` | MOC Request (browser) | stored booking ID + tracking code |
| `POST /api/notify/venue-booking` | MOC Request (browser) | stored venue booking ID + tracking code |
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
| `GET /api/health` | deployment monitor | none |
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

## Signed notification ingest

External senders may `POST` to `/api/notifications/requests` or
`/api/notifications/bookings`. The JSON body may contain only `event_type`,
the matching UUID (`request_id` or `booking_id`), and an optional `status`
(maximum 64 characters); its canonical form must be no larger than 8 KiB.

Every request requires these headers:

- `X-Notification-Timestamp`: a 10-digit Unix timestamp in seconds, accepted
  only within five minutes of the API clock.
- `X-Notification-Nonce`: a UUID (v1–v5), used once and retained for ten
  minutes to prevent replay.
- `X-Signature`: a 64-hex-character HMAC-SHA256 digest. Case is ignored.

Sign the UTF-8 bytes of
`${timestamp}.${nonce}.${canonicalJson(body)}` with `NOTIFICATIONS_INGEST_SECRET`.
`canonicalJson` recursively sorts object keys lexicographically, uses compact
JSON without whitespace, preserves array order, escapes strings with
`JSON.stringify`, and rejects non-JSON values. A replay returns `409`; a
malformed, missing, or expired signing value returns `401`. If the nonce store
is unavailable, the API returns `503` rather than accepting a request it cannot
replay-protect.

## Provider proxy routing

`/api/youtube/v3/*` and `/api/zoom/v2/*` are one `[...path]` function each, but
this deployment hands such a function **only a single path segment** — a request
for a nested provider route (`liveBroadcasts/bind`, `meetings/{id}`,
`users/me/meetings`) 404s at the platform before any code runs, and a 404 has no
CORS headers, so the browser reports it as a preflight failure rather than a
missing route.

The `rewrites` in [vercel.json](vercel.json) therefore point every provider path
at a single-segment URL (`_proxy`) and carry the real path in a `rewrittenPath`
query parameter. Callers which already use the collapsed path send
`providerPath` instead. `authorizeProviderRoute` accepts either parameter and
applies the same method, path and permission rules to both, so the parameter
grants nothing a direct call would not. It is never forwarded upstream.

Adding a real file per nested route would also work, but the entrypoints are
consolidated to keep routing and authorization policy in one place.

## CORS

Browser calls arrive cross-origin and carry a session plus workspace context in
headers (`x-moc-session`, `x-moc-workspace`), so `ALLOWED_ORIGINS` is an exact allow-list
and the API echoes the caller's origin — never `*`. Unset means no browser
origin is allowed. Telegram and Vercel Cron send no `Origin` and are unaffected.

**Deploy the API with both frontend origins listed before pointing the
frontends at it**, or every call fails preflight.

## Environment

See [.env.example](.env.example). The Supabase URL retains its historical
`VITE_`-prefixed name, but the API app does not bundle it; no server secret is
shipped to a browser.

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

Vercel CLI reads `.env` in local-only mode, while this repository keeps local
configuration in the ignored `.env.local`. The launcher creates a temporary
symlink for the dev process and removes it on shutdown; it never copies or
prints the values.

Only work that touches Zoom, YouTube or notifications needs the API running.
Requests, equipment and bookings go straight to Supabase from the browser.

The root command pins the Vercel CLI version and deliberately avoids an
API-local `dev` script: Vercel treats that script as its application
development command, which would recursively invoke itself.

## Health and request correlation

`GET /api/health` is a cache-disabled liveness/readiness probe. It returns
`200` only when the API's core server configuration is present and `503` when
it is not; it never reveals environment values. Responses include
`X-Request-Id`, and the function emits one structured request log with that ID,
route, method, status, duration, and deployment identifier. Set a monitor to
probe this endpoint after each deployment.

## Edge abuse protection

Rate limiting must be enforced by the deployed edge/WAF as well as any API
guard. Configure Vercel WAF rate rules for the public notification wake,
signed-ingest, Telegram webhook, OAuth mutation, and provider-proxy routes.
Use separate rules for read and write proxy methods, begin with the limits in
the API's `RATE_LIMIT_POLICIES`, and alert on blocks or sustained `429`s. This
cannot be configured safely in this repository because the production Vercel
project is not linked here; apply and verify the rules in that project's
dashboard before production rollout.

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
