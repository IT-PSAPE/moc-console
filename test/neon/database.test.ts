import { describe, expect, test } from 'vitest';
import { queryRows, withActor, type DatabaseActor } from '../../packages/backend/src/database';

const databaseUrl = process.env.MOC_TEST_DATABASE_URL;
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
describe.skipIf(!databaseUrl)('Neon database adapter', () => {
  test('uses parameter binding and returns rows', async () => {
    const boundValue = "bound'value OR true --";
    const rows = await queryRows<{ value: string }>('select $1::text as value', [boundValue]);
    expect(rows).toEqual([{ value: boundValue }]);
  });

  test('keeps actor context local to a transaction and rolls back failures', async () => {
    const actor = { userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', workspaceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', role: 'moc_app' as const };
    await expect(withActor(actor, async (client) => {
      const rows = await client.query<{ role: string; userId: string; workspaceId: string }>(
        `select current_user as role, current_setting('moc.user_id', true) as "userId", current_setting('moc.workspace_id', true) as "workspaceId"`,
      );
      expect(rows.rows[0]).toEqual({ role: 'moc_app', userId: actor.userId, workspaceId: actor.workspaceId });
      await client.query('CREATE TEMP TABLE actor_rollback_probe (value text)');
      await client.query('INSERT INTO actor_rollback_probe VALUES ($1)', ['transaction row']);
      throw new Error('force rollback');
    })).rejects.toThrow('force rollback');

    const clean = await withActor({ userId: null, workspaceId: null, role: 'moc_worker' }, async (client) => {
      const result = await client.query<{ userId: string | null; workspaceId: string | null; rolledBack: string | null }>(
        `select nullif(current_setting('moc.user_id', true), '') as "userId",
          nullif(current_setting('moc.workspace_id', true), '') as "workspaceId",
          to_regclass('pg_temp.actor_rollback_probe')::text as "rolledBack"`,
      );
      return result.rows[0];
    });
    expect(clean).toEqual({ userId: null, workspaceId: null, rolledBack: null });
  });

  test('rejects invalid actor identity before opening a transaction', async () => {
    await expect(withActor({ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', workspaceId: null, role: 'moc_public' }, async () => null))
      .rejects.toThrow('Public database actors cannot set a user id');
    await expect(withActor({ userId: 'not-a-uuid', workspaceId: null, role: 'moc_worker' }, async () => null))
      .rejects.toThrow('Database actor user id is invalid');
    const injectedRole = 'moc_app; SELECT pg_sleep(10)' as DatabaseActor['role'];
    await expect(withActor({ userId: null, workspaceId: null, role: injectedRole }, async () => null))
      .rejects.toThrow('Database actor role is invalid');
  });

  test('discards a client when rollback fails after connection loss', async () => {
    await expect(withActor({ userId: null, workspaceId: null, role: 'moc_worker' }, async (client) => {
      await client.query('SELECT pg_terminate_backend(pg_backend_pid())');
      throw new Error('force rollback after backend termination');
    })).rejects.toThrow();

    const rows = await queryRows<{ value: number }>('SELECT 1 AS value');
    expect(rows).toEqual([{ value: 1 }]);
  });
});
