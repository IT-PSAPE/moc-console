import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { getDatabase, withActor } from '../../packages/backend/src/database';

const databaseUrl = process.env.MOC_TEST_DATABASE_URL;
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

describe.skipIf(!databaseUrl)('Neon database authorization', () => {
  const editorId = randomUUID();
  const createOnlyId = randomUUID();
  const viewerId = randomUUID();
  const createOnlyRoleId = randomUUID();
  const categoryKey = `codex-test-${randomUUID()}`;
  let workspaceId = '';
  let otherWorkspaceId = '';
  beforeAll(async () => {
    const pool = getDatabase();
    const [workspace, , editorRole, viewerRole, memberType] = await Promise.all([
      pool.query<{ id: string }>("SELECT id FROM public.workspaces WHERE slug = 'default-workspace'"),
      pool.query<{ id: string }>("INSERT INTO public.roles (id, name, can_create, can_read, can_update) VALUES ($1, $2, true, true, false) RETURNING id", [createOnlyRoleId, `codex-test-${createOnlyRoleId}`]),
      pool.query<{ id: string }>("SELECT id FROM public.roles WHERE name = 'editor'"),
      pool.query<{ id: string }>("SELECT id FROM public.roles WHERE name = 'viewer'"),
      pool.query<{ id: string }>("SELECT id FROM public.workspace_member_types WHERE is_default LIMIT 1"),
    ]);
    workspaceId = workspace.rows[0]!.id;
    const editorRoleId = editorRole.rows[0]!.id;
    const viewerRoleId = viewerRole.rows[0]!.id;
    const memberTypeId = memberType.rows[0]!.id;
    const otherWorkspace = await pool.query<{ id: string }>(
      'INSERT INTO public.workspaces (name, slug) VALUES ($1, $2) RETURNING id',
      [`Codex Authorization ${randomUUID()}`, `codex-auth-${randomUUID()}`],
    );
    otherWorkspaceId = otherWorkspace.rows[0]!.id;

    for (const userId of [editorId, createOnlyId, viewerId]) {
      await pool.query('INSERT INTO moc_auth."user" (id, name, email) VALUES ($1, $2, $3)', [userId, 'Authorization test', `${userId}@example.test`]);
      await pool.query('INSERT INTO public.users (id, name, surname, email) VALUES ($1, $2, $3, $4)', [userId, 'Authorization', 'Test', `${userId}@example.test`]);
    }
    await pool.query(
      `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
       VALUES ($1, $2, $3, $5), ($1, $4, $6, $5), ($1, $7, $8, $5)`,
      [workspaceId, editorId, editorRoleId, createOnlyId, memberTypeId, createOnlyRoleId, viewerId, viewerRoleId],
    );
  });

  afterAll(async () => {
    if (!databaseUrl || !workspaceId) return;
    const pool = getDatabase();
    await pool.query('DELETE FROM public.request_categories WHERE workspace_id = $1 AND key = $2', [workspaceId, categoryKey]);
    await pool.query('DELETE FROM public.workspace_users WHERE user_id = ANY($1::uuid[])', [[editorId, createOnlyId, viewerId]]);
    await pool.query('DELETE FROM moc_auth."user" WHERE id = ANY($1::uuid[])', [[editorId, createOnlyId, viewerId]]);
    await pool.query('DELETE FROM public.roles WHERE id = $1', [createOnlyRoleId]);
    await pool.query('DELETE FROM public.workspaces WHERE id = $1', [otherWorkspaceId]);
  });

  test('evaluates can_create and can_update inside INSERT ON CONFLICT DO UPDATE', async () => {
    const upsert = `INSERT INTO public.request_categories (workspace_id, key, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (workspace_id, key) DO UPDATE SET name = EXCLUDED.name
      RETURNING name`;
    const created = await withActor({ userId: editorId, workspaceId, role: 'moc_app' }, async (client) =>
      client.query<{ name: string }>(upsert, [workspaceId, categoryKey, 'Editor created']),
    );
    expect(created.rows[0]?.name).toBe('Editor created');

    const updated = await withActor({ userId: editorId, workspaceId, role: 'moc_app' }, async (client) =>
      client.query<{ name: string }>(upsert, [workspaceId, categoryKey, 'Editor updated']),
    );
    expect(updated.rows[0]?.name).toBe('Editor updated');

    await withActor({ userId: createOnlyId, workspaceId, role: 'moc_app' }, async (client) => {
      await expect(client.query(upsert, [workspaceId, categoryKey, 'Must be denied']))
        .rejects.toThrow(/row-level security/i);
    });
    const persisted = await getDatabase().query<{ name: string }>(
      'SELECT name FROM public.request_categories WHERE workspace_id = $1 AND key = $2',
      [workspaceId, categoryKey],
    );
    expect(persisted.rows[0]?.name).toBe('Editor updated');
  });

  test('a forged selected workspace setting does not grant membership', async () => {
    const rows = await withActor({ userId: editorId, workspaceId: otherWorkspaceId, role: 'moc_app' }, (client) =>
      client.query<{ id: string }>('SELECT id FROM public.request_categories WHERE workspace_id = $1', [otherWorkspaceId]),
    );
    expect(rows.rows).toEqual([]);
  });

  test('a viewer cannot create a category even with a verified user id', async () => {
    await expect(withActor({ userId: viewerId, workspaceId, role: 'moc_app' }, (client) =>
      client.query('INSERT INTO public.request_categories (workspace_id, key, name) VALUES ($1, $2, $3)', [workspaceId, `${categoryKey}-viewer`, 'Viewer denied']),
    )).rejects.toThrow(/row-level security/i);
  });
});
