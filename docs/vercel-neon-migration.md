# MoC Vercel + Neon deployment

The platform contract is `MoC apps → @moc/sdk → MoC API on Vercel → Neon`.
Console, Request, Broadcast and API remain separate Vercel applications. Browser
code has no provider clients, database connections or storage credentials. The
three app projects rewrite same-origin `/api/*` to `https://api.psape.co.za/api/*`;
local Vite servers proxy to `MOC_API_PROXY_TARGET` (default `http://127.0.0.1:3001`).

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
uses the injected unpooled URL because its startup `search_path` is incompatible
with transaction pooling. Keep all credentials behind the API. Create an ordinary
runtime login with `NOINHERIT`, no database/role creation and no RLS bypass, then
grant the three runtime roles without inheritance. `withActor` selects the role
inside each transaction. Neon API-created roles may have elevated privileges;
do not use them as the application's restricted runtime login.

`MOC_AUTH_SERVICE_SECRET` is generated locally, not obtained from Neon. Generate
it with `openssl rand -hex 32` and store the same value in the API and its auth
Function. Generate `BETTER_AUTH_SECRET` separately for the auth Function. Use
distinct secrets for local development and production. `NEON_AUTH_FUNCTION_URL`
must identify the deployed MoC Function; the managed Neon Auth URL does not
implement the signed MoC service protocol.

For local setup, use `http://localhost:5173` for both canonical origins and include
it in both trusted-origin lists. Deploy a separate `authdev` Function configured
with the local secrets and link origins; point `apps/api/.env.local` at that
Function. Keep the production `auth` Function configured for
`https://console.psape.co.za`. Cookie security follows the canonical URL unless
explicitly overridden with `MOC_AUTH_COOKIE_SECURE`.

Configure SMTP and verify outbound connectivity, sender delivery and link origins.
Provider OAuth client IDs, registered redirects, webhook URLs and Telegram Mini
App URLs retain their existing values. Supply provider secrets and bot credentials
to the corresponding Neon workers. Frontends need no backend credentials or API
base URL; local API routing uses the server-only `MOC_API_PROXY_TARGET` setting.

For Resend SMTP, verify the sender domain and create a Sending Access key scoped
to that domain. Set `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`,
`SMTP_USER=resend`, `SMTP_PASSWORD` to the key and `SMTP_FROM` to a sender on
the verified domain. Port 465 uses implicit TLS. Store the key only in ignored
Neon environment files or deployment secrets. Signup, verification email and
password recovery return `EMAIL_UNAVAILABLE` before identity changes while SMTP
configuration is missing. Verify delivery and links after adding credentials.

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

The Supabase snapshot cutover uses `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` in ignored `neon/.env.local`. Use the current
`sb_secret_...` key from Settings → API Keys → Publishable and secret API keys.
Send it in the `apikey` header for the HTTPS Data and Storage APIs; it is not
a JWT for `Authorization: Bearer`. The legacy `service_role` JWT is unnecessary.
These are server secrets, never frontend environment variables. Destination
credentials are `NEON_DATABASE_URL` and the `NEON_STORAGE_*` values in
`neon/.env.example`.

The connected Supabase SQL tool exports schema/type metadata, independent table
fingerprints, private OAuth rows, selected `auth.users` identity fields, and the
Storage inventory into protected operator files. `export-supabase-snapshot.mjs`
combines those files with explicitly selected domain rows from the Data API.
This route does not require a source PostgreSQL password. A direct or session
pooler `LEGACY_SOURCE_DATABASE_URL` remains an alternative for the generic
PostgreSQL transfer tools; an API key cannot replace that database password.
Supabase's separate S3 credentials are also optional when copying objects through
its HTTPS Storage API. See the [current API key guidance](https://supabase.com/docs/guides/getting-started/api-keys),
[Storage secret-key guidance](https://supabase.com/docs/guides/functions/storage-caching),
and [separate S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication).

The snapshot importer validates all 49 source tables, source UUIDs, verified
email/bcrypt credentials, source column types, and independent PostgreSQL
fingerprints against the exported rows. It permits only two explicit type
mappings: occurrence `send_on` dates become midnight UTC timestamps, and
schedule `expiry_hours` integers widen to numeric. New request links and ordered
attendee columns receive their target defaults. Unknown schema drift fails closed.

```sh
node --env-file=neon/.env.local neon/database/import-supabase-snapshot.mjs \
  --snapshot output/supabase-migration/source-snapshot.json \
  --plan output/supabase-migration/target-plan.json
```

Before cutover, back up the destination, review the dry-run counts and target
fingerprint, and rehearse against a local restore of that backup. The replacement
imports source-owned domain rows and auth identities together, preserving source
UUIDs and passwords. Existing target sessions and verification tokens are cleared;
users sign in again. The current source supports verified email/password accounts;
unsupported restrictions or identity providers block import rather than being
silently discarded. This is a replacement procedure, not a merge.

After explicit cutover approval, apply the same reviewed plan by adding
`--apply --confirm-replace-target`. The importer locks the affected tables,
rechecks target and snapshot fingerprints, restores foreign keys and sequences,
and verifies all source rows and imported credentials before committing. Errors
roll back the transaction. Keep background workers stopped through database and
file registration. Recheck source fingerprints before applying so source changes
are not omitted from the export.

The protected snapshot contains credential hashes and private OAuth values.
Keep snapshots, backups, plans, manifests and downloaded files under ignored
`output/supabase-migration`, with directories mode 0700 and files mode 0600.
Never commit, attach or print their contents.

`download-supabase-storage.mjs` downloads every inventoried object and verifies its
size and SHA-256. Review its manifest before upload. Objects referenced by app rows
receive verified owner/workspace/purpose metadata and API paths. Unreferenced
objects are preserved privately under a `supabase-migration/` prefix with their
original Storage row retained in object metadata. Ambiguous referenced objects
block transfer. `upload-neon-storage.mjs` validates locally by default; approved
`--apply` conditionally creates private destination objects and verifies their
bytes and metadata without overwriting conflicting files.

`register-neon-storage.mjs --rehearse` runs registration and exact URL rewrites
against an explicit loopback `NEON_MIGRATION_REHEARSAL_DATABASE_URL`, then rolls
back. Its approved `--apply` mode verifies remote bytes first, registers referenced
objects, and rewrites imported avatar and broadcast URLs transactionally. Verify
domain parity before URL rewrites and verify those deliberate changes separately.

The generic `import-domain-data.mjs` and `verify-import-parity.mjs` remain available
for PostgreSQL-to-PostgreSQL transfer to an empty compatible domain baseline.
Their schema requirements and separate identity/file steps differ from the
Supabase snapshot procedure; see `neon/database/README.md`.

## Deploy and exercise

Deploy the API, then the three apps with SDK rewrites. Preserve project domains
and integration callbacks. Stage the API with `vercel deploy --prod --skip-domain`
and verify it with `vercel curl` before promoting its custom domain. The API's
explicit auth rewrite routes nested signup, sign-in and reset links into its
Node Function; verify those routes on the deployment as well as locally.
Exercise signup, access approval, verification,
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
