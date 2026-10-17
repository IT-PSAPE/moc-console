import { Pool } from 'pg';
import { registerStorageManifest } from './storage-registration.mjs';
import { storageRehearsalFingerprint } from './storage-rehearsal-fingerprint.mjs';
import {
  createStorageClient,
  loadMigrationEnvironment,
  readStorageManifest,
  verifyLocalManifestObjects,
  verifyRemoteManifestObjects,
} from './storage-transfer-runtime.mjs';

function isLoopbackDatabaseUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

async function updateDatabase(connectionString, manifest, commit) {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const before = commit ? null : await storageRehearsalFingerprint(client);
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    const count = await registerStorageManifest(client, manifest);
    if (commit) await client.query('COMMIT');
    else await client.query('ROLLBACK');
    if (before) {
      const after = await storageRehearsalFingerprint(client);
      if (before.digest !== after.digest || before.rowCount !== after.rowCount) {
        throw new Error('Database rehearsal rollback changed imported domain or storage metadata rows');
      }
    }
    return count;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const env = loadMigrationEnvironment();
  const rehearsal = process.argv.includes('--rehearse');
  const apply = process.argv.includes('--apply');
  if (rehearsal && apply) throw new Error('Choose either --rehearse or --apply');
  const manifest = await readStorageManifest();
  await verifyLocalManifestObjects(manifest);

  if (!rehearsal && !apply) {
    console.log(`Validated ${manifest.objects.length} local objects; ${manifest.objects.filter((object) => object.state === 'registered').length} eligible for metadata registration.`);
    return;
  }

  let connectionString;
  if (rehearsal) {
    connectionString = env.NEON_MIGRATION_REHEARSAL_DATABASE_URL;
    if (!connectionString || !isLoopbackDatabaseUrl(connectionString)) {
      throw new Error('Rehearsal requires a loopback NEON_MIGRATION_REHEARSAL_DATABASE_URL');
    }
  } else {
    connectionString = env.NEON_DATABASE_URL;
    if (!connectionString) throw new Error('NEON_DATABASE_URL is required');
    const storage = createStorageClient(env);
    try {
      await verifyRemoteManifestObjects(storage, manifest);
    } finally {
      await storage.destroy();
    }
  }
  const count = await updateDatabase(connectionString, manifest, apply);
  if (rehearsal) console.log(`Rehearsed ${count} registrations and domain rewrites; rollback preserved the imported domain and storage metadata rows.`);
  else console.log(`Registered ${count} app objects and transactionally rewrote their verified domain rows.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
