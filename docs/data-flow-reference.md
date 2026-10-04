# Data Flow Reference

This document describes how the current MOC applications reach application data and shape API results for display. The [schema reference](./schema-reference.md) documents the Neon PostgreSQL model; this page focuses on the API and runtime boundaries.

## Request paths

| Domain | Client entry points | Server boundary | Notes |
| --- | --- | --- | --- |
| Requests | `apps/console/src/data/fetch-requests.ts`, `mutate-requests.ts`; `apps/request/src/data/submit-request.ts`, `tracking-submissions.ts` | `packages/sdk/src/requests.ts`, `public-submissions.ts`; `apps/api/server/platform/requests.ts`, `platform/public.ts`, `server/public-submissions/store.ts` | Public submit and tracking are explicit operations. Tracking codes are bearer secrets; lookup and mutation keep rate limiting, optimistic concurrency, and requester notification writes on the server. |
| Authentication | `apps/console/src/lib/auth-context.tsx` | `packages/sdk/src/auth.ts`; `neon/functions/auth.ts`; MOC API auth routes | Better Auth validates credentials in a Neon Function. The API verifies its signed response and owns app session cookies and workspace authorization. |
| Workspace and users | `apps/console/src/data/current-workspace.ts`, `fetch-workspaces.ts`, `fetch-users.ts` | `packages/sdk/src/workspaces.ts`, `users.ts`; `apps/api/server/platform/workspaces.ts`, `users.ts` | Memberships and approval state are checked server-side. A selected workspace header is only context; the API verifies membership and permission. |
| Equipment and bookings | `apps/console/src/data/fetch-equipment.ts`, `mutate-equipment.ts`, `mutate-booking.ts`; `apps/request/src/data/submit-booking.ts` | `packages/sdk/src/equipment.ts`, `bookings.ts`; `apps/api/server/platform/equipment.ts`, `bookings.ts`, `public.ts` | The API performs workspace-scoped SQL operations. Booking display fields such as equipment name and duration are joined or derived at the application boundary. |
| Venues | Console and Request data modules under `apps/console/src/data/` and `apps/request/src/data/` | `packages/sdk/src/venues.ts`, `venue-bookings.ts`; `apps/api/server/platform/venues.ts`, `venue-bookings.ts`, `public.ts` | Public venue submissions are explicit API operations. Booking lifecycle phase is derived from the start/end timestamps, not written as a separate phase. |
| Streams and integrations | `apps/console/src/data/fetch-streams.ts`, `mutate-streams.ts`, `fetch-zoom.ts` | `packages/sdk/src/streams.ts`, `integrations.ts`; `apps/api/server/platform/streams.ts`, `apps/api/server/routes/youtube-proxy.ts`, `zoom-proxy.ts` | OAuth credentials remain server-side. The API calls YouTube and Zoom, and Neon scheduled workers reconcile provider state. Local stream records cache provider state for the application. |
| Notifications | Console notification settings and event data modules | `packages/sdk/src/notifications.ts`, `notification-settings.ts`; `apps/api/server/notifications/` | Notification delivery uses a transactional outbox. Requester events are created in the same PostgreSQL transaction as the source mutation and retried by the Neon notification worker. |
| Public tracking | `apps/request/src/data/tracking-submissions.ts` | `packages/sdk/src/public-submissions.ts`; `apps/api/server/public-submissions/store.ts` | `POST`, `PATCH`, and `DELETE /api/public/submissions` keep the tracking secret, exact input checks, allowed-origin policy, rate limits, and concurrency checks on the API. |

All frontend data access uses typed `@moc/sdk` capabilities over same-origin `/api/*` routes. Vercel rewrites forward those requests to MOC API. The SDK exposes domain operations and typed models; it does not expose a generic SQL, table, or RPC endpoint.

## Storage and read models

The database stores normalized rows with `snake_case` fields and UUID identifiers. Server-side API operations join the related rows required by each contract and return typed domain data. Runtime mapping keeps `camelCase` application names and adds display fields only where needed.

For example, a booking is stored with `equipment_id`, `booked_by`, `checked_out_at`, and `expected_return_at`. A booking list result can include `equipmentName`; duration and the venue booking phase are derived for display. Keep those convenience values out of the normalized rows unless they become durable domain state.

## Authorization boundary

The MOC API derives the authenticated user from a verified session and verifies workspace membership and permission before performing an application operation. The API uses parameterized SQL and transaction-local actor context. Public Request operations have explicit schemas and rate limits and accept workspace IDs only through the named public operation contract. Browser-provided identifiers never establish actor identity or membership.

## Public request categories

`request_categories` is workspace-scoped. The public form can read active categories, while tracking an older request returns its stored category and joined current label even if the category is inactive. Settings can add, rename, deactivate, or delete unused categories; categories referenced by requests cannot be deleted.

## Mapping conventions

- Database identifiers are UUIDs; frontend identifiers remain opaque strings.
- Database fields use `snake_case`; API and application fields use `camelCase`.
- Keep foreign-key relationships normalized and perform joins in server operations.
- Resolve workspace-scoped data through verified membership, then map results to the smallest domain shape the client needs.
- Keep convenience fields, formatting, and time-derived phases in the application layer unless they are durable domain state.
