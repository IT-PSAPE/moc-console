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
than beside production code. CI bootstraps a disposable PostgreSQL 18 database,
then runs builds, the full Bun suite, a separate auth contract, and lint.

Set `MOC_TEST_DATABASE_URL` to a disposable local database to enable Neon domain
and role integration tests. Set `MOC_AUTH_TEST_DATABASE_URL` to a separate local
database for the auth contract. See [migration verification](../docs/vercel-neon-migration.md).

The browser regression script is in `scripts/date-time-fields.browser-test.js`
inside this folder; its header describes the isolated Playwright session.
Neon schema, authorization and worker tests live in `test/neon`.
PostgreSQL integration tests use disposable local databases and never require
the hosted database.
