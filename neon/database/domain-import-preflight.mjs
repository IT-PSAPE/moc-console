import {
  baselineCounts,
  publicTables,
  sourcePrivateExclusions,
  sourcePublicExclusions,
  tables,
  tableLabel,
  targetTableLabel,
} from './domain-import-tables.mjs';
import { getColumns, getPrimaryKey, tableCount } from './domain-import-transfer.mjs';

export async function assertTargetIsFresh(client) {
  const countResult = await client.query('SELECT (SELECT count(*) FROM public.users) AS users_count');
  if (Number(countResult.rows[0].users_count) !== 0) {
    throw new Error('Target already contains public.users rows; refusing to overwrite domain data');
  }
  for (const table of tables) {
    const count = await tableCount(client, table.targetSchema, table.name);
    const expected = table.targetSchema === 'public' ? (baselineCounts.get(table.name) ?? 0) : 0;
    if (count !== expected) {
      throw new Error(`Target is not a fresh bootstrap: ${targetTableLabel(table)} has ${count} rows, expected ${expected}`);
    }
  }
  const otherTables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT (tablename = ANY($1::text[]))`,
    [publicTables],
  );
  for (const row of otherTables.rows) {
    const count = await tableCount(client, 'public', row.tablename);
    if (count !== 0) throw new Error(`Target is not fresh: public.${row.tablename} contains ${count} rows`);
  }
  const otherPrivateTables = await client.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'moc_private' AND tablename <> 'integration_oauth_tokens'`,
  );
  for (const row of otherPrivateTables.rows) {
    const count = await tableCount(client, 'moc_private', row.tablename);
    if (count !== 0) throw new Error(`Target is not fresh: moc_private.${row.tablename} contains ${count} rows`);
  }
}

export async function assertSourceSchema(source, target) {
  for (const table of tables) {
    const [sourceColumns, targetColumns] = await Promise.all([
      getColumns(source, table.sourceSchema, table.name), getColumns(target, table.targetSchema, table.name),
    ]);
    if (sourceColumns.length === 0) throw new Error(`Source is missing ${tableLabel(table)}`);
    if (JSON.stringify(sourceColumns) !== JSON.stringify(targetColumns)) {
      throw new Error(`Column layout mismatch for ${tableLabel(table)}; no rows were written`);
    }
    const [sourceKey, targetKey] = await Promise.all([
      getPrimaryKey(source, table.sourceSchema, table.name), getPrimaryKey(target, table.targetSchema, table.name),
    ]);
    if (JSON.stringify(sourceKey) !== JSON.stringify(targetKey)) {
      throw new Error(`Primary-key layout mismatch for ${tableLabel(table)}; no rows were written`);
    }
  }
  await assertSourceTableInventory(source);
}

async function assertSourceTableInventory(source) {
  const actualPublic = await source.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const allowedPublic = new Set([...publicTables, ...sourcePublicExclusions]);
  const unlistedPublic = actualPublic.rows.map((row) => row.tablename).filter((name) => !allowedPublic.has(name));
  const missingPublic = publicTables.filter((name) => !actualPublic.rows.some((row) => row.tablename === name));
  if (unlistedPublic.length > 0 || missingPublic.length > 0) {
    throw new Error(`Source public schema drift; unsupported tables: ${unlistedPublic.join(', ') || 'none'}; missing approved tables: ${missingPublic.join(', ') || 'none'}`);
  }

  const actualPrivate = await source.query("SELECT tablename FROM pg_tables WHERE schemaname = 'private' ORDER BY tablename");
  const allowedPrivate = new Set(['integration_oauth_tokens', ...sourcePrivateExclusions]);
  const unlistedPrivate = actualPrivate.rows.map((row) => row.tablename).filter((name) => !allowedPrivate.has(name));
  if (unlistedPrivate.length > 0 || !actualPrivate.rows.some((row) => row.tablename === 'integration_oauth_tokens')) {
    throw new Error(`Source private schema drift; unsupported tables: ${unlistedPrivate.join(', ') || 'none'}; expected private.integration_oauth_tokens`);
  }
}

export async function assertAuthIdentities(source, target) {
  const sourceUsers = await source.query('SELECT id FROM public.users ORDER BY id');
  const ids = sourceUsers.rows.map((row) => row.id);
  for (let offset = 0; offset < ids.length; offset += 1000) {
    const batch = ids.slice(offset, offset + 1000);
    const targetUsers = await target.query(
      'SELECT id FROM moc_auth."user" WHERE id = ANY($1::uuid[])',
      [batch],
    );
    if (targetUsers.rows.length !== batch.length) {
      throw new Error('Better Auth identity import is incomplete for one or more public.users UUIDs');
    }
  }
}
