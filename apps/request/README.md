# MOC Request

Public-facing form app for submitting requests, equipment bookings, and venue bookings into a MOC Console workspace. New submissions use narrow public Supabase RPCs. Tracking-code lookup, requester edits, and requester deletion go through the dedicated MOC API domain; admin management happens in the sibling [moc-console](https://github.com/IT-PSAPE/moc-console) app.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- React Router v7
- Supabase (`@supabase/supabase-js`) for RPC calls
- Dedicated MOC API for tracking-code lookup and mutations

## Screens

Routed in [src/App.tsx](src/App.tsx); paths defined in [src/screens/console-routes.ts](src/screens/console-routes.ts) (only the `public*` entries are mounted today).

| Path             | Screen             | Purpose                                            |
| ---------------- | ------------------ | -------------------------------------------------- |
| `/`              | HomeScreen         | Landing — links to request, equipment, venue, and tracking flows. |
| `/request`       | RequestScreen      | Submit a new request (title, priority, details).   |
| `/booking`       | BookingScreen      | Submit an equipment booking against a date range.  |
| `/venue`         | VenueScreen        | Submit a venue booking against available time slots. |
| `/confirmation`  | ConfirmationScreen | Success page after a submission; shows tracking code. |
| `/track`         | TrackScreen        | View, edit, or delete a changeable submission using its tracking code. |

## Submission boundaries

New submissions and public catalog reads use deliberately narrow anonymous
Supabase RPCs:

- `public_submit_request` — [src/data/submit-request.ts](src/data/submit-request.ts)
- `public_submit_booking_batch` — [src/data/submit-booking.ts](src/data/submit-booking.ts)
- `public_submit_venue_booking` — [src/data/submit-venue-booking.ts](src/data/submit-venue-booking.ts)
- `public_list_request_categories` — [src/data/fetch-request-categories.ts](src/data/fetch-request-categories.ts)
- venue/event/availability reads — the corresponding files under `src/data/`

Tracking uses `POST`, `PATCH`, and `DELETE /api/public/submissions` through
[src/data/tracking-submissions.ts](src/data/tracking-submissions.ts). The API
holds the service credential, applies CORS and rate limits, and calls the
service-role-only tracking RPCs. The browser never calls the retired
`public_lookup_tracking` function.

The current signatures, grants, stronger tracking codes, requester mutation
functions, and managed categories are defined in
[20260920120000_public_submission_management.sql](../../supabase/migrations/20260920120000_public_submission_management.sql).

## Outbound notifications

The database enqueues a durable Telegram notification in the same transaction as
each public request or booking submission. After a successful RPC, this client
best-effort wakes that pending event with only its returned record ID and tracking
code; message content, workspace, and destinations remain server-derived. Failed
wakes do not affect submission and are retried by the API cron job.

Requester edits and deletions enqueue distinct `*.requester_updated` and
`*.requester_deleted` events transactionally. This lets console-configured
notification routes distinguish an external requester change from a console
operator change.

The confirmation screen can copy the code or share a privacy warning, the code,
and a link to `/track`. The code is not placed in the URL because URLs commonly
leak into browser history, analytics, previews, and server logs.

## Environment variables

See [.env.example](.env.example).

Client (`VITE_*` — exposed to the browser):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_WORKSPACE_ID` — UUID of the workspace this deployment submits into.
- `VITE_API_BASE_URL` — HTTPS origin of the MOC API app, e.g. `https://api.psape.co.za`. It must also allow this app's exact origin through `ALLOWED_ORIGINS`. Blank keeps `/api/*` calls relative and is intended only for a same-origin local proxy.

There are no server-side variables: this app ships no serverless functions. Server secrets live in `apps/api/.env.example`.

## Project structure

```
supabase/                Shared Supabase phases, patch history, and drift check
src/data/                Supabase RPC clients + outbound notify helpers
src/features/            Domain hooks (use-request-form, use-booking-form, etc.)
src/lib/                 Supabase client + workspace env helper
src/screens/             Route-level screens
src/types/               Domain types (request, booking, equipment)
src/components/          Shared UI primitives
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Supabase keys + workspace id
npm run dev
```

Build, lint, preview:

```bash
npm run build
npm run lint
npm run preview
```
