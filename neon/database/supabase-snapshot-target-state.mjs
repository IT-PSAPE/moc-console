import { createHash } from 'node:crypto';
import { getColumns, getPrimaryKey } from './domain-import-transfer.mjs';
import { qualifiedName, quoteIdentifier, tables } from './domain-import-tables.mjs';
import { canonicalJson } from './supabase-snapshot-validation.mjs';

const authTables = ['user', 'account', 'session', 'verification'];

export function hashRows(rows) {
  const hash = createHash('sha256');
  for (const row of rows) hash.update(`${canonicalJson(row)}\n`);
  return hash.digest('hex');
}

export async function rowsForTable(client, schema, table, columns, primaryKey) {
  const selected = columns.map(quoteIdentifier).join(', ');
  const order = primaryKey.map(quoteIdentifier).join(', ');
  const result = await client.query(`SELECT ${selected} FROM ${qualifiedName(schema, table)} ORDER BY ${order}`);
  return result.rows;
}

export async function targetOnlyRows(client) {
  const [publicResult, privateResult] = await Promise.all([
    client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"),
    client.query("SELECT tablename FROM pg_tables WHERE schemaname='moc_private' ORDER BY tablename"),
  ]);
  const imported = new Set(tables.map((table) => `${table.targetSchema}.${table.name}`));
  const unrelated = [
    ...publicResult.rows.map((row) => ({ schema: 'public', name: row.tablename })),
    ...privateResult.rows.map((row) => ({ schema: 'moc_private', name: row.tablename })),
  ].filter((table) => !imported.has(`${table.schema}.${table.name}`));
  const populated = [];
  for (const table of unrelated) {
    const result = await client.query(`SELECT count(*)::text AS count FROM ${qualifiedName(table.schema, table.name)}`);
    const count = Number(result.rows[0].count);
    if (count > 0) populated.push({ table: `${table.schema}.${table.name}`, count });
  }
  if (populated.length) throw new Error(`Target contains rows outside the import scope: ${populated.map((item) => item.table).join(', ')}`);
  return unrelated.map((table) => `${table.schema}.${table.name}`).sort();
}

export async function targetState(client) {
  const identity = (await client.query('SELECT current_database() AS database_name, inet_server_addr()::text AS server_address, inet_server_port() AS server_port')).rows[0];
  const counts = {};
  const digests = {};
  for (const table of tables) {
    const columns = await getColumns(client, table.targetSchema, table.name);
    const key = await getPrimaryKey(client, table.targetSchema, table.name);
    const rows = await rowsForTable(client, table.targetSchema, table.name, columns, key);
    const label = `${table.targetSchema}.${table.name}`;
    counts[label] = rows.length;
    digests[label] = hashRows(rows);
  }
  const authCounts = {};
  const authDigests = {};
  for (const table of authTables) {
    const columns = table === 'user'
      ? ['id', 'name', 'email', 'email_verified', 'image', 'surname', 'workspace_slug', 'created_at', 'updated_at']
      : table === 'account'
        ? ['id', 'account_id', 'provider_id', 'user_id', 'access_token', 'refresh_token', 'id_token', 'access_token_expires_at', 'refresh_token_expires_at', 'scope', 'password', 'created_at', 'updated_at']
        : table === 'session'
          ? ['id', 'expires_at', 'token', 'created_at', 'updated_at', 'ip_address', 'user_agent', 'user_id']
          : ['id', 'identifier', 'value', 'expires_at', 'created_at', 'updated_at'];
    const result = await client.query(`SELECT ${columns.map(quoteIdentifier).join(', ')} FROM moc_auth.${quoteIdentifier(table)} ORDER BY ${quoteIdentifier(columns[0])}`);
    authCounts[table] = result.rows.length;
    authDigests[table] = hashRows(result.rows);
  }
  const unrelatedTables = await targetOnlyRows(client);
  const state = { identity, counts, digests, authCounts, authDigests, unrelatedTables };
  return { ...state, fingerprint: createHash('sha256').update(canonicalJson(state)).digest('hex') };
}
