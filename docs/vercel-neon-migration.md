# MoC Vercel + Neon deployment

The platform contract is `MoC apps → @moc/sdk → MoC API on Vercel → Neon`.
Console, Request, Broadcast and API remain separate Vercel applications. Browser
code has no provider clients, database connections or storage credentials. The
three app projects rewrite same-origin `/api/*` to `https://api.psape.co.za/api/*`;
local Vite servers proxy to `MOC_API_PROXY_TARGET` (default port 3001).

The selected target is **PSAPE / Frankfurt**, Neon project `blue-wind-16947728`,
branch `br-gentle-butterfly-b1quozc3` (`production`). MoC uses the application-owned
`moc_auth` schema and Better Auth in a Neon Function. Identity IDs are UUIDs and
passwords use bcrypt. API cookies are opaque, host-only, HttpOnly, Secure on HTTPS
and scoped to `/api`.

## Configuration

Copy `apps/api/.env.example` and `neon/.env.example` into ignored local files or
configure equivalent server-side deployment secrets. Never commit values.
The two auth secrets must be independent, high-entropy values of at least 32 bytes.
Use the exact Console public origin for `MOC_AUTH_PUBLIC_BASE_URL` and
`MOC_CONSOLE_ORIGIN`; list exact accepted app/dev origins in
`MOC_AUTH_TRUSTED_ORIGINS` and API `ALLOWED_ORIGINS`. Test preview origins explicitly.

Neon injects branch-scoped `DATABASE_URL` and S3 environment values into Functions.
The Vercel API needs its own server-only pooled URL, private S3 credentials,
`NEON_AUTH_FUNCTION_URL`, `MOC_AUTH_SERVICE_SECRET` and trusted origins. Its
connection needs membership in the app, public and worker roles. Better Auth
uses a connection with access to `moc_auth`. Keep all credentials behind the API.

Configure SMTP and verify outbound connectivity, sender delivery and link origins.
Provider OAuth client IDs, registered redirects, webhook URLs and Telegram Mini
App URLs retain their existing values. Supply provider secrets and bot credentials
to the corresponding Neon workers. Frontends need no backend credentials or API
base URL; local API routing uses the server-only `MOC_API_PROXY_TARGET` setting.

## Provision and verify

```sh
npm ci
npm run build
npm run lint
npm test
node neon/scripts/check-cutover.ts
```

Use `MOC_TEST_DATABASE_URL` for a disposable local PostgreSQL database and
`MOC_AUTH_TEST_DATABASE_URL` for a separate auth-contract database. Neither may
point at production. The auth fixture creates its own schema and fake SMTP server.
CI runs PostgreSQL-backed integration tests alongside boundary and unit suites.

Link the Neon CLI to the selected project and production branch. Review
`neon config plan`, then deploy `neon.ts` with jobs disabled. It declares private
`avatars`, `media`, `broadcast-media` buckets and six Node Functions. Verify the
selected context and any changes to existing resources before applying the plan.

Install the standalone schema only into an empty MoC destination:

```sh
bash neon/database/build-fresh-database.sh "$NEON_DATABASE_URL"
```

The schema does not depend on historical SQL or another backend implementation.
Run its catalog verifier and `check-cutover.ts --schema` before activation.

## Existing data

No live data transfer or production deployment has been performed by this cleanup.
Provider-specific identity and object-import adapters have been removed. Moving
existing accounts and assets now requires a separate export/import procedure,
completed and verified before directing live users to the new deployment.

Preserve identity UUIDs, verified-email flags, supported password hashes and
account restrictions in `moc_auth`; verify profile foreign keys and email parity.
Old sessions and email-link tokens cannot authenticate against the new service.
Arrange fresh sign-in, verification and recovery links before activation.

Generic PostgreSQL domain transfer tools remain in `neon/database`. They require
`LEGACY_SOURCE_DATABASE_URL` and `NEON_DATABASE_URL`, existing target identities,
and an empty target domain baseline. Dry-run before explicit writes:

```sh
node neon/database/import-domain-data.mjs
node neon/database/import-domain-data.mjs --apply --confirm-empty-target
node neon/database/verify-import-parity.mjs
```

These tools validate schema, primary keys, foreign keys and row fingerprints.
Unexpected source tables stop the transfer. Preserve private OAuth credentials,
replay state and rate-limit counters without printing their values. Copy referenced
assets into the private Neon buckets, verify size/hash/ownership metadata in
`moc_private.storage_objects`, and set persistent asset URLs to API paths. Perform
domain parity before deliberate URL rewrites, then verify those changes separately.

## Deploy and exercise

Deploy the API, then the three apps with SDK rewrites. Preserve project domains
and integration callbacks. Exercise signup, access approval, verification,
recovery, sign-in/out, workspace switching, requests, checklists, equipment and
venue bookings, providers, Telegram, scheduled messages and notification retries
in real desktop and mobile browsers. Capture network requests to verify all
application operations stay on `/api/*`.

Verify a 500 MiB video upload through 4 MiB API chunks and Neon 8 MiB multipart
assembly, interrupted retries, exact size/hash, cancellation, expiry and stale
multipart cleanup. Test downloads and beginning/middle/end Range seeks with
conditional requests and aborted clients on the actual Vercel deployment.
Private avatars/thumbnails must deny unauthorized reads; linked public broadcast
assets are streamed through API paths.

Exercise broadcast SSE reconnects, revision cursors, reorder, deletions,
retention gaps and rollback. Connections close at 55 seconds and the SDK reconnects.

## Scheduled jobs and rollback

Stop previous schedulers and source writers before final data transfer. Enable
Neon jobs only after verification by setting `MOC_ENABLE_PRODUCTION_JOBS=true`
and `MOC_NEON_BRANCH=production`, reviewing the plan and deploying it.

| Trigger | UTC schedule |
| --- | --- |
| Weekly archive | Monday 00:00 |
| Notification deliveries/maintenance | Daily 01:00 |
| Provider synchronization | Daily 09:00 |
| Scheduled messages | Hourly |
| Upload finalization/cleanup | Every minute |

Preview jobs stay disabled. Verify actual trigger provenance and recorded runs.
Keep leases, unique claims and retry rules intact. Preserve an independent backup
and rollback plan. After new writes are admitted, stop writers and reconcile the
delta before reverting any deployment or database; blind rollback loses records
or duplicates deliveries.
