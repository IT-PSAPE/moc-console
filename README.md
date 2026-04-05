# MOC Console

MOC Console is a React 19 admin application for managing operational workflows across:

- requests
- equipment
- broadcast media and playlists
- cue sheet views
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

### Requests

- overview dashboard
- all requests
- archived requests
- request detail view
- request assignees and request duty roles

Requests are the most complete data flow in the app today. They read and write through Supabase.

### Equipment

- overview
- inventory
- bookings
- maintenance
- equipment detail view
- reports placeholder

Equipment currently reads from mock JSON files and uses mock mutations.

### Broadcast

- overview
- media library
- playlists
- playlist detail view

Broadcast media and playlists currently read from mock JSON files and use mock mutations.

### Cue Sheet

- overview
- event
- checklist

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

## Project Structure

Main source folders:

- `src/screens` for route-level screens
- `src/features` for domain-specific state and UI
- `src/components` for shared UI primitives and composed components
- `src/data` for data access and mock data
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

- This schema documentation is inferred from the current TypeScript models, Supabase queries, row mappers, and mock data in the repository.
- There are no checked-in SQL migrations or generated database types in this repo at the moment.

## Current Data Backing

### Supabase-backed

- requests
- request assignees
- request duty roles
- users
- user roles
- roles
- auth sessions

### Mock-backed

- equipment
- equipment bookings
- broadcast media
- broadcast playlists
- playlist cues

Mock data lives under `src/data/mock`.

## Routing Summary

Protected routes are mounted in [src/App.tsx](/Users/Craig/Developer/Projects/moc-console/src/App.tsx) and defined in [src/screens/console-routes.ts](/Users/Craig/Developer/Projects/moc-console/src/screens/console-routes.ts).

Main app sections:

- `/dashboard`
- `/requests`
- `/requests/all-requests`
- `/requests/archived`
- `/requests/:id`
- `/equipment`
- `/equipment/inventory`
- `/equipment/bookings`
- `/equipment/maintenance`
- `/equipment/:id`
- `/broadcast`
- `/broadcast/media`
- `/broadcast/playlists`
- `/broadcast/playlists/:id`
- `/cue-sheet`
- `/cue-sheet/event`
- `/cue-sheet/checklist`

Auth routes:

- `/login`
- `/signup`
- `/reset-password`

## Notes For Contributors

- Follow the project rules in `AGENTS.md`.
- Reuse existing shared components before creating new feature-level UI.
- Keep business logic in hooks, services, and utilities rather than in presentational components.
- Match the current domain patterns before introducing new structure.
