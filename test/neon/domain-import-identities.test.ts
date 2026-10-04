import { describe, expect, test } from 'vitest';
import { assertAuthIdentities } from '../../neon/database/domain-import-preflight.mjs';

describe('domain import identity preflight', () => {
  test('requires every source profile UUID in the Better Auth identity table', async () => {
    const source = {
      query: async (sql: string) => sql.includes('to_regnamespace')
        ? { rows: [{ present: false }] }
        : { rows: [{ id: 'profile-a' }, { id: 'profile-b' }] },
    };
    const target = {
      query: async (sql: string, values: unknown[]) => {
        expect(sql).toContain('moc_auth."user"');
        expect(sql).not.toContain('public.users');
        expect(values).toEqual([['profile-a', 'profile-b']]);
        return { rows: [{ id: 'profile-a' }, { id: 'profile-b' }] };
      },
    };

    await expect(assertAuthIdentities(source, target)).resolves.toBeUndefined();
  });

  test('rejects when a source profile has no imported identity', async () => {
    const source = {
      query: async (sql: string) => sql.includes('to_regnamespace')
        ? { rows: [{ present: false }] }
        : { rows: [{ id: 'missing-identity' }] },
    };
    const target = { query: async () => ({ rows: [] }) };

    await expect(assertAuthIdentities(source, target)).rejects.toThrow('Better Auth identity import is incomplete');
  });
});
