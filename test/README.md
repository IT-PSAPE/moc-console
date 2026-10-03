# Tests

Automated tests and their fixtures live here, mirroring the production paths:

```text
apps/api/server/cors.ts                  → test/apps/api/server/cors.test.ts
packages/notifications/src/templates.ts → test/packages/notifications/src/templates.test.ts
```

Run commands from the repository root:

```sh
bun run test                  # All Bun tests
bun run test:api              # API tests only
bun test test/apps/console    # One app
bun test test/packages/ui     # One package
bun run lint:test             # Test TypeScript/TSX lint checks
```

Tests import production modules using relative paths into `apps` or `packages`.
Test-only helpers stay beside the tests that use them. Add new tests here rather
than beside production code. CI runs the full Bun suite after builds and lint.

The browser regression script is in `scripts/date-time-fields.browser-test.js`
inside this folder; its header describes the isolated Playwright session.
SQL assertions, fixtures and disposable PostgreSQL runners are in
[`supabase/tests`](supabase/tests/README.md) inside this folder. They run
separately from Bun and never require the hosted database.
