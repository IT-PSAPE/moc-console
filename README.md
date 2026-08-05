# MOC Console

MOC Console is a React 19 admin application for managing operational workflows across:

- requests (archived ones behind a filter)
- equipment inventory
- equipment bookings
- checklist runs and reusable templates
- YouTube streams and Zoom meetings
- authenticated users and role-aware navigation

The UI is built with React, TypeScript, Vite, and Tailwind CSS v4.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Supabase Auth and data access

## Feature Areas

Navigation is flat: one sidebar item per feature, no nested sections.

### Requests

- all submitted requests
- request detail view
- request assignees and request duty roles

### Equipment

- full inventory (list, table and kanban views)
- status filter, including items in maintenance
- equipment detail view with QR and notes

### Bookings

- equipment bookings (list, table and calendar views)
- booking detail view with scan-based checkout and return

### Checklists

- active and completed checklist runs
- reusable checklist templates
- item grouping, ordering, completion, and assignments

### Streams

- YouTube live streams
- Zoom meetings
- stream and meeting detail views

## Authentication

The app uses Supabase Auth for login, signup, reset password, and session handling.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

These are read in [src/lib/supabase.ts](/Users/Craig/Developer/Projects/moc-console/src/lib/supabase.ts).

## Getting Started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Preview the production build:

```bash
npm run preview
```

## Database setup

The SQL source of truth now lives at [`supabase/`](supabase/). See its
[`readme.md`](supabase/readme.md) before running anything; the patch directory
is a historical ledger and must not be applied wholesale.

For a blank project, run `phase-01-schema.sql`, `phase-02-logic.sql`, and
`phase-03-security.sql`, followed by the current target-schema convergence
script. For the existing MoC Console project, run
[`verify-current-schema.sql`](supabase/verify-current-schema.sql) first and
apply no SQL when the drift report is clean.

New signups create a pending workspace access request. An owner or admin must
approve that request before the account gains normal member access. Roles are
stored per workspace in `workspace_users.role_id`.

`supabase/phase-00-nuke.sql` is development-only, destructive, and has no undo.
Never use it as an upgrade script.

Configure each app (`apps/console`, `apps/request`, `apps/api`) from its
`.env.example`. The frontends use the Supabase URL, publishable key, and
`VITE_API_BASE_URL`; server secrets live only in `apps/api`.

**External integrations.** The schema is complete on its own. Optional
features — Telegram bot linking/notifications, YouTube and Zoom
streaming — additionally require their own credentials and external
services (bot token, OAuth apps); these are app/config concerns, not
database setup.

## Project Structure

The repo is a bun-workspaces monorepo:

- `apps/console` — the authenticated admin app (this README)
- `apps/request` — the public submission PWA
- `apps/api` — every serverless function and the `server/` library behind it; see [apps/api/README.md](apps/api/README.md)
- `packages/{ui,types,utils,data,notifications}` — shared code

Inside a frontend app:

- `src/screens` for route-level screens
- `src/features` for domain-specific state and UI
- `src/components` for shared UI primitives and composed components
- `src/data` for Supabase reads, writes and mappers
- `src/types` for domain models
- `src/lib` for app infrastructure such as Supabase and auth context
- `docs` for project documentation

## Data Model Documentation

Two documentation files describe the current codebase schema and expected values:

- [docs/schema-reference.md](/Users/Craig/Developer/Projects/moc-console/docs/schema-reference.md)
- [docs/value-guide.md](/Users/Craig/Developer/Projects/moc-console/docs/value-guide.md)

Use them together:

- `schema-reference.md` describes fields, types, nullability, relationships, and enum values.
- `value-guide.md` explains what values should actually be used in practice and calls out current implementation conventions.

Important caveat:

- This schema documentation is inferred from the current TypeScript models and Supabase queries in the repository.
- There are no checked-in SQL migrations or generated database types in this repo at the moment.

## Current Data Backing

### Supabase-backed

- auth users
- users
- user roles
- roles
- auth sessions
- request duty role presets

### Not backed by mocks

Nothing is mock-backed any more — every operational domain reads and
writes Supabase directly.

## Routing Summary

Protected routes are mounted in [src/App.tsx](/Users/Craig/Developer/Projects/moc-console/src/App.tsx) and defined in [src/screens/console-routes.ts](/Users/Craig/Developer/Projects/moc-console/src/screens/console-routes.ts).

Main app sections:

- `/dashboard`
- `/requests`
- `/requests/:id`
- `/equipment`
- `/equipment/:id`
- `/bookings`
- `/bookings/:id`
- `/streams`
- `/streams/stream/:id`
- `/streams/meeting/:id`

Auth routes:

- `/login`
- `/signup`
- `/reset-password`

## Notes For Contributors

- Follow the project rules in `AGENTS.md`.
- Reuse existing shared components before creating new feature-level UI.
- Keep business logic in hooks, services, and utilities rather than in presentational components.
- Match the current domain patterns before introducing new structure.
