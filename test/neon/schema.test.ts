import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

const schema = await readFile(new URL('../../neon/database/20-domain-final.sql', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../../neon/database/build-fresh-database.sh', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../../neon/database/01-runtime-roles.sql', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../../packages/backend/src/database.ts', import.meta.url), 'utf8');

test('standalone final schema keeps MoC identities and transaction actors', () => {
  expect(schema.startsWith('-- Standalone final-state MoC PostgreSQL domain schema.')).toBe(true);
  expect(schema).toContain('REFERENCES moc_auth."user"(id) ON DELETE CASCADE');
  expect(schema).toContain('moc_private.actor_id()');
  expect(schema).not.toContain('schema_migrations');
  expect(schema).not.toMatch(/^\s*(?:BEGIN|COMMIT);\s*$/m);
  expect(bootstrap).toContain('20-domain-final.sql');
});

test('runtime roles are constrained and actor context is private', () => {
  expect(runtime).toContain("current_setting('moc.user_id', true)");
  expect(adapter).toContain("set_config('moc.user_id', $1, true), set_config('moc.workspace_id', $2, true)");
  expect(runtime).toContain('NOBYPASSRLS');
  expect(runtime).toContain('BYPASSRLS');
  expect(runtime).toContain('REVOKE ALL ON FUNCTION moc_private.actor_id() FROM PUBLIC');
});
