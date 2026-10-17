import { getPrimaryKey } from './domain-import-transfer.mjs';
import { qualifiedName, quoteIdentifier, tables } from './domain-import-tables.mjs';
import { allowedTargetOnlyColumns, canonicalJson } from './supabase-snapshot-validation.mjs';

export async function verifyTableParity(client, snapshot, validation) {
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const item = validation.byName.get(label);
    const typeResult = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,
      [table.targetSchema, table.name],
    );
    const columnTypes = new Map(typeResult.rows.map((row) => [row.column_name, row.data_type]));
    const primaryKey = await getPrimaryKey(client, table.targetSchema, table.name);
    const selected = item.columns.map(quoteIdentifier).join(', ');
    const projected = primaryKey.map(quoteIdentifier).join(', ');
    const result = await client.query(
      `SELECT to_jsonb(imported_row) AS row FROM (SELECT ${selected} FROM ${qualifiedName(table.targetSchema, table.name)} ORDER BY ${projected}) AS imported_row`,
    );
    if (result.rows.length !== item.rows.length) throw new Error(`Imported row-count verification failed for ${label}`);
    const sourceRows = new Map(item.rows.map((row) => [primaryKey.map((column) => canonicalJson(row[column])).join('|'), row]));
    for (const resultRow of result.rows) {
      const targetRow = resultRow.row;
      const key = primaryKey.map((column) => canonicalJson(targetRow[column])).join('|');
      const sourceRow = sourceRows.get(key);
      if (!sourceRow) throw new Error(`Imported content verification failed for ${label}`);
      if (item.columns.some((column) => canonicalJson(normalizeDatabaseValue(sourceRow[column], columnTypes.get(column)))
        !== canonicalJson(normalizeDatabaseValue(targetRow[column], columnTypes.get(column))))) {
        const differentColumns = item.columns.filter((column) => canonicalJson(normalizeDatabaseValue(sourceRow[column], columnTypes.get(column)))
          !== canonicalJson(normalizeDatabaseValue(targetRow[column], columnTypes.get(column))));
        throw new Error(`Imported content verification failed for ${label}; differing columns: ${differentColumns.join(', ')}`);
      }
      sourceRows.delete(key);
    }
    if (sourceRows.size) throw new Error(`Imported content verification failed for ${label}`);
  }
}

function fingerprintProjectionSql(table, item, sourcePayload) {
  const projectedValues = item.columns.flatMap((column) => [
    `'${column.replaceAll("'", "''")}'`,
    item.columnTypes[column] === 'date' && table.name === 'scheduled_message_occurrences' && column === 'send_on'
      ? `to_jsonb(projected_row.${quoteIdentifier(column)}::date)`
      : `to_jsonb(projected_row.${quoteIdentifier(column)})`,
  ]).join(', ');
  const source = sourcePayload
    ? `(SELECT * FROM jsonb_populate_recordset(NULL::${qualifiedName(table.targetSchema, table.name)}, $1::jsonb)) AS projected_row`
    : `${qualifiedName(table.targetSchema, table.name)} AS projected_row`;
  return `SELECT md5(coalesce(string_agg(projected_json::text, E'\\n' ORDER BY projected_json::text), '')) AS digest
            FROM (SELECT jsonb_build_object(${projectedValues}) AS projected_json FROM ${source}) AS source_projection`;
}

export async function fingerprintSnapshotRows(client, table, item) {
  const result = await client.query(fingerprintProjectionSql(table, item, true), [JSON.stringify(item.rows)]);
  return result.rows[0].digest;
}

export async function fingerprintImportedRows(client, table, item) {
  const result = await client.query(fingerprintProjectionSql(table, item, false));
  return result.rows[0].digest;
}

export async function verifySourceFingerprints(client, validation) {
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const item = validation.byName.get(label);
    const digest = await fingerprintSnapshotRows(client, table, item);
    if (digest !== item.sourceDigest) throw new Error(`Snapshot payload fingerprint verification failed for ${label}`);
  }
}

export async function verifyImportedFingerprints(client, validation) {
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const item = validation.byName.get(label);
    const digest = await fingerprintImportedRows(client, table, item);
    if (digest !== item.sourceDigest) throw new Error(`Imported source fingerprint verification failed for ${label}`);
  }
}

export function normalizeDatabaseValue(value, type) {
  if (value === null || value === undefined) return value;
  if (type === 'date' && typeof value === 'string') return value.slice(0, 10);
  if (type === 'timestamp with time zone' && typeof value === 'string') {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return value;
}

export async function verifyTargetOnlyDefaults(client, validation) {
  const expectedDefaults = {
    request_id: null,
    attendee_ids: [],
    send_time: '00:00:00',
  };
  for (const table of tables) {
    const extras = allowedTargetOnlyColumns(table);
    if (extras.length === 0) continue;
    const item = validation.byName.get(`${table.sourceSchema}.${table.name}`);
    const primaryKey = await getPrimaryKey(client, table.targetSchema, table.name);
    const columns = [...primaryKey, ...extras];
    const result = await client.query(
      `SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${qualifiedName(table.targetSchema, table.name)}`,
    );
    if (result.rows.length !== item.rows.length) throw new Error(`Target-only column verification failed for ${table.targetSchema}.${table.name}`);
    const expectedKeys = new Set(item.rows.map((row) => primaryKey.map((column) => canonicalJson(row[column])).join('|')));
    for (const row of result.rows) {
      const key = primaryKey.map((column) => canonicalJson(row[column])).join('|');
      if (!expectedKeys.delete(key) || extras.some((column) => canonicalJson(row[column]) !== canonicalJson(expectedDefaults[column]))) {
        throw new Error(`Target-only column verification failed for ${table.targetSchema}.${table.name}`);
      }
    }
    if (expectedKeys.size) throw new Error(`Target-only column verification failed for ${table.targetSchema}.${table.name}`);
  }
}

export async function verifyAuthParity(client, snapshot, profiles) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const result = await client.query(
    `SELECT u.id,u.name,u.email,u.email_verified,u.surname,a.account_id,a.provider_id,a.password
       FROM moc_auth."user" u LEFT JOIN moc_auth.account a ON a.user_id=u.id AND a.provider_id='credential'
      ORDER BY u.id`,
  );
  if (result.rows.length !== snapshot.authUsers.length) throw new Error('Imported auth user count verification failed');
  const sourceById = new Map(snapshot.authUsers.map((user) => [user.id, user]));
  for (const target of result.rows) {
    const source = sourceById.get(target.id);
    const profile = profilesById.get(target.id);
    if (!source || !profile || target.email.toLocaleLowerCase() !== source.email.toLocaleLowerCase()
      || target.name !== `${profile.name} ${profile.surname}`.trim() || target.surname !== profile.surname
      || target.email_verified !== true || target.account_id !== source.id || target.password !== source.encrypted_password) {
      throw new Error('Imported auth identity verification failed');
    }
    sourceById.delete(target.id);
  }
  if (sourceById.size) throw new Error('Imported auth identity verification failed');
}
