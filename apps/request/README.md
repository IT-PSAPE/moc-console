# MOC Request

Public-facing form app for submitting requests and equipment bookings into a MOC Console workspace. Submissions are written to Supabase via public RPCs; admin management (status changes, assignment, fulfilment) happens in the sibling [moc-console](https://github.com/IT-PSAPE/moc-console) app.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- React Router v7
- Supabase (`@supabase/supabase-js`) for RPC calls
- Vercel serverless functions (under `api/`) for outbound notification relay

## Screens

Routed in [src/App.tsx](src/App.tsx); paths defined in [src/screens/console-routes.ts](src/screens/console-routes.ts) (only the `public*` entries are mounted today).

| Path             | Screen             | Purpose                                            |
| ---------------- | ------------------ | -------------------------------------------------- |
| `/`              | HomeScreen         | Landing — links to the request and booking forms.  |
| `/request`       | RequestScreen      | Submit a new request (title, priority, details).   |
| `/booking`       | BookingScreen      | Submit an equipment booking against a date range.  |
| `/confirmation`  | ConfirmationScreen | Success page after a submission; shows tracking code. |
| `/track`         | TrackScreen        | Look up an existing request/booking by tracking code. |

## Supabase RPCs called

All mutations are public Supabase RPCs — no authentication required, since this is a public submission surface.

- `public_submit_request` — [src/data/submit-request.ts](src/data/submit-request.ts)
- `public_submit_booking_batch` — [src/data/submit-booking.ts](src/data/submit-booking.ts)
- `public_lookup_tracking` — [src/data/lookup-tracking.ts](src/data/lookup-tracking.ts)
- Equipment catalogue read — [src/data/fetch-equipment.ts](src/data/fetch-equipment.ts)

The RPC signatures and grants are defined by the current [target-schema convergence script](../../supabase/patches/2026-08-04-moc-console-target-schema-cleanup.sql).

## Outbound notifications

The database enqueues a durable Telegram notification in the same transaction as
each public request or booking submission. After a successful RPC, this client
best-effort wakes that pending event with only its returned record ID and tracking
code; message content, workspace, and destinations remain server-derived. Failed
wakes do not affect submission and are retried by the API cron job.

## Environment variables

See [.env.example](.env.example).

Client (`VITE_*` — exposed to the browser):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_WORKSPACE_ID` — UUID of the workspace this deployment submits into.
- `VITE_API_BASE_URL` — origin of the MOC API app, e.g. `https://api.psape.co.zw`. Blank keeps `/api/*` calls relative to this app's own origin.

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
