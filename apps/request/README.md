# MOC Request

Public-facing form app for submitting requests, equipment bookings, and venue bookings into a MOC Console workspace. Platform operations go through typed `@moc/sdk` methods to the MOC API; admin management happens in the sibling [moc-console](https://github.com/IT-PSAPE/moc-console) app.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- React Router v7
- `@moc/sdk` for public catalog, submission, and tracking operations

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

Public catalog reads and submissions use explicitly named API operations
through `@moc/sdk`:

- request, equipment booking, and venue booking submissions — the corresponding files under `src/data/`
- public request categories and venue availability — the corresponding files under `src/data/`

Tracking uses SDK methods from
[src/data/tracking-submissions.ts](src/data/tracking-submissions.ts). The API
owns the tracking secret, rate limits, and optimistic concurrency checks.

The API contract is implemented by
[`public.ts`](../api/server/platform/public.ts) and
[`store.ts`](../api/server/public-submissions/store.ts). The database model is
documented in the [schema reference](../../docs/schema-reference.md).

## Outbound notifications

The database enqueues a durable Telegram notification in the same transaction as
each public request or booking submission. The client then best-effort asks the
API to wake that pending event with only its returned record ID and tracking
code; message content, workspace, and destinations remain server-derived. Failed
wakes do not affect submission and are retried by the API worker.

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

- `VITE_WORKSPACE_ID` — UUID of the workspace this deployment submits into.

The frontend calls same-origin `/api/*` routes. Vercel rewrites those routes to the MOC API. For local development, `MOC_API_PROXY_TARGET` configures Vite's server-side `/api` proxy.

There are no server-side variables: this app ships no serverless functions. Server secrets live in `apps/api/.env.example`.

## Project structure

```
src/data/                Domain service calls through the SDK
src/features/            Domain hooks (use-request-form, use-booking-form, etc.)
src/lib/                 SDK singleton + workspace env helper
src/screens/             Route-level screens
src/types/               Domain types (request, booking, equipment)
src/components/          Shared UI primitives
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the workspace id and optional local proxy target
npm run dev
```

Build, lint, preview:

```bash
npm run build
npm run lint
npm run preview
```
