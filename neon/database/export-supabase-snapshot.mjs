import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tables } from './domain-import-tables.mjs';
import { validatedSupabaseSourceUrl } from './supabase-source-url.mjs';

const directory = resolve(process.argv[2] ?? 'output/supabase-migration');
const projectId = 'jypshhgfuvwmtbbcxmhs';

async function readJson(name) {
  return JSON.parse(await readFile(resolve(directory, name), 'utf8'));
}

async function exportTable(table, definition, sourceUrl, key) {
  const rows = [];
  let total;
  do {
    const url = new URL(`/rest/v1/${table.name}`, sourceUrl);
    url.searchParams.set('select', definition.columns.join(','));
    url.searchParams.set('order', definition.primaryKey.map(column => `${column}.asc`).join(','));
    const response = await fetch(url, {
      redirect: 'error',
      headers: { apikey: key, Prefer: 'count=exact', Range: `${rows.length}-${rows.length + 499}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Export failed for ${table.name}: HTTP ${response.status}`);
    const count = response.headers.get('content-range')?.split('/')[1];
    if (!count || !/^\d+$/.test(count)) throw new Error(`Missing exact export count for ${table.name}`);
    if (total !== undefined && total !== Number(count)) throw new Error(`Source changed while exporting ${table.name}`);
    total = Number(count);
    const page = await response.json();
    if (!Array.isArray(page) || (!page.length && rows.length < total)) throw new Error(`Incomplete export for ${table.name}`);
    rows.push(...page);
  } while (rows.length < total);
  if (rows.length !== total) throw new Error(`Export count mismatch for ${table.name}`);
  return { ...table, columns: definition.columns, columnTypes: definition.columnTypes, rows };
}

async function main() {
  const sourceUrl = validatedSupabaseSourceUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith('sb_secret_')) throw new Error('A current SUPABASE_SECRET_KEY is required');
  const [schema, admin, fingerprints] = await Promise.all([
    readJson('source-schema.json'), readJson('source-admin.json'), readJson('source-fingerprints.json'),
  ]);
  const snapshot = {
    version: 1, projectId, exportedAt: new Date().toISOString(), tables: [],
    authUsers: admin.authUsers, storageBuckets: admin.storageBuckets, storageObjects: admin.storageObjects,
    sourceFingerprints: fingerprints,
  };
  for (let offset = 0; offset < tables.length; offset += 4) {
    const results = await Promise.allSettled(tables.slice(offset, offset + 4).map(async table => {
      const definition = schema.find(entry => entry.table_schema === table.sourceSchema && entry.table_name === table.name);
      if (!definition?.primaryKey?.length) throw new Error(`Missing source definition for ${table.name}`);
      const fingerprint = fingerprints.find(entry => entry.name === `${table.sourceSchema}.${table.name}`);
      const data = table.sourceSchema === 'private'
        ? { ...table, columns: definition.columns, columnTypes: definition.columnTypes, rows: admin.privateTables.find(entry => entry.name === table.name)?.rows }
        : await exportTable(table, definition, sourceUrl, key);
      if (!Array.isArray(data.rows) || data.rows.length !== fingerprint?.rows) throw new Error(`Source inventory changed for ${table.name}`);
      return { ...data, sourceDigest: fingerprint.digest };
    }));
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason;
      snapshot.tables.push(result.value);
    }
    process.stdout.write(`EXPORTED ${snapshot.tables.length}/${tables.length} tables\n`);
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const path = resolve(directory, 'source-snapshot.json');
  await writeFile(path, JSON.stringify(snapshot), { mode: 0o600 });
  await chmod(path, 0o600);
  process.stdout.write(`Snapshot saved: ${tables.length} tables, ${snapshot.authUsers.length} identities, ${snapshot.storageObjects.length} storage objects.\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Snapshot export failed'}\n`);
  process.exitCode = 1;
});
