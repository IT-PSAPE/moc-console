import { Pool } from 'pg';
import {
  assertAuthIdentities,
  assertSourceSchema,
  assertTargetIsFresh,
} from './domain-import-preflight.mjs';
import { dropForeignKeys, getForeignKeys, restoreForeignKeys, verifyForeignKeys } from './domain-import-foreign-keys.mjs';
import { fingerprint, getColumns, getPrimaryKey, copyTable, syncSequences } from './domain-import-transfer.mjs';
import { qualifiedName, tableLabel, tables } from './domain-import-tables.mjs';

function databaseUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  try {
    if (!['postgres:', 'postgresql:'].includes(new URL(value).protocol)) throw new Error();
  } catch {
    throw new Error(`${name} must be a PostgreSQL URL`);
  }
  return value;
}

function safeError(error) {
  const message = error instanceof Error ? error.message : 'Unknown import error';
  return message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL redacted]');
}

async function assertDistinctDatabases(source, target, apply) {
  if (!apply) return;
  const query = 'SELECT current_database() AS database_name, inet_server_addr()::text AS server_address, inet_server_port() AS server_port';
  const [sourceIdentity, targetIdentity] = await Promise.all([source.query(query), target.query(query)]);
  const sourceDatabase = sourceIdentity.rows[0];
  const targetDatabase = targetIdentity.rows[0];
  if (sourceDatabase.database_name === targetDatabase.database_name
    && sourceDatabase.server_address === targetDatabase.server_address
    && sourceDatabase.server_port === targetDatabase.server_port) {
    throw new Error('Source and target resolve to the same PostgreSQL database; refusing to import');
  }
}

async function runImport() {
  const apply = process.argv.includes('--apply');
  const confirmed = process.argv.includes('--confirm-empty-target');
  if (apply && !confirmed) throw new Error('Writing requires both --apply and --confirm-empty-target');
  if (!apply && confirmed) throw new Error('--confirm-empty-target is only valid with --apply');

  const sourcePool = new Pool({ connectionString: databaseUrl('LEGACY_SOURCE_DATABASE_URL'), max: 1, connectionTimeoutMillis: 5_000 });
  const targetPool = new Pool({ connectionString: databaseUrl('NEON_DATABASE_URL'), max: 1, connectionTimeoutMillis: 5_000 });
  let source;
  let target;
  let targetTransaction = false;
  try {
    source = await sourcePool.connect();
    target = await targetPool.connect();
    await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await assertDistinctDatabases(source, target, apply);
    await assertSourceSchema(source, target);
    await assertTargetIsFresh(target);
    await assertAuthIdentities(source, target);

    const sourceColumns = new Map();
    const primaryKeys = new Map();
    for (const table of tables) {
      sourceColumns.set(table, await getColumns(source, table.sourceSchema, table.name));
      primaryKeys.set(table, await getPrimaryKey(source, table.sourceSchema, table.name));
    }

    if (!apply) {
      process.stdout.write(`DRY RUN validated ${tables.length} domain tables\n`);
      for (const table of tables) {
        const result = await fingerprint(source, table.sourceSchema, table, sourceColumns.get(table), primaryKeys.get(table));
        process.stdout.write(`READY ${tableLabel(table)}: ${result.count} rows\n`);
      }
      return;
    }

    await target.query('BEGIN');
    targetTransaction = true;
    await assertTargetIsFresh(target);
    const foreignKeys = (await getForeignKeys(target)).rows;
    for (const table of tables) {
      await target.query(`ALTER TABLE ${qualifiedName(table.targetSchema, table.name)} DISABLE TRIGGER USER`);
    }
    await dropForeignKeys(target, foreignKeys);
    await target.query(`TRUNCATE TABLE ${tables.map((table) => qualifiedName(table.targetSchema, table.name)).join(', ')} CASCADE`);
    for (const table of tables) {
      await copyTable(source, target, table, sourceColumns.get(table), primaryKeys.get(table));
      process.stdout.write(`COPIED ${tableLabel(table)}\n`);
    }
    await syncSequences(target);
    for (const table of tables) {
      await target.query(`ALTER TABLE ${qualifiedName(table.targetSchema, table.name)} ENABLE TRIGGER USER`);
    }
    await restoreForeignKeys(target, foreignKeys);
    await verifyForeignKeys(target);
    for (const table of tables) {
      const sourceResult = await fingerprint(source, table.sourceSchema, table, sourceColumns.get(table), primaryKeys.get(table));
      const targetResult = await fingerprint(target, table.targetSchema, table, sourceColumns.get(table), primaryKeys.get(table));
      if (sourceResult.count !== targetResult.count || sourceResult.digest !== targetResult.digest) {
        throw new Error(`Parity verification failed for ${tableLabel(table)}; rolling back the import`);
      }
      process.stdout.write(`VERIFIED ${tableLabel(table)}: ${sourceResult.count} rows\n`);
    }
    await target.query('COMMIT');
    targetTransaction = false;
    process.stdout.write('Domain import committed after row-count and content verification.\n');
  } finally {
    if (targetTransaction && target) await target.query('ROLLBACK').catch(() => undefined);
    if (source) await source.query('ROLLBACK').catch(() => undefined);
    source?.release();
    target?.release();
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

runImport().catch((error) => {
  process.stderr.write(`${safeError(error)}\n`);
  process.exitCode = 1;
});
