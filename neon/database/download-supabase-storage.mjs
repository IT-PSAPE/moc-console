import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { buildStorageManifest } from './storage-migration.mjs';
import { validatedSupabaseSourceUrl } from './supabase-source-url.mjs';
import { loadMigrationEnvironment, migrationDirectory, objectDirectory, localObjectPath, sha256File } from './storage-transfer-runtime.mjs';

const output = migrationDirectory;
const objectsDirectory = objectDirectory;

function destinationFor(object) {
  return localObjectPath(object);
}

async function verifyExisting(path, expectedSize, expectedHash) {
  const result = await sha256File(path);
  if (result.size !== expectedSize || (expectedHash && result.sha256 !== expectedHash)) throw new Error('Existing local object failed integrity verification');
  return result.sha256;
}

async function downloadObject(baseUrl, secret, object, receipt) {
  const destination = destinationFor(object);
  const receiptPath = `${destination}.receipt.json`;
  try {
    const existing = JSON.parse(await readFile(receiptPath, 'utf8'));
    const sha256 = await verifyExisting(destination, object.sourceSize, existing.sha256);
    return { ...receipt, sha256 };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const url = new URL(`/storage/v1/object/public/${encodeURIComponent(object.sourceBucket)}/${object.sourcePath.split('/').map(encodeURIComponent).join('/')}`, baseUrl);
  const response = await fetch(url, { headers: { apikey: secret }, redirect: 'error' });
  if (!response.ok || !response.body) throw new Error(`Supabase object download failed with HTTP ${response.status}`);
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await chmod(dirname(destination), 0o700).catch(() => undefined);
  const temporary = `${destination}.${randomUUID()}.part`;
  const hash = createHash('sha256');
  let size = 0;
  const inspect = new Transform({ transform(chunk, _encoding, callback) {
    size += chunk.length;
    hash.update(chunk);
    callback(null, chunk);
  } });
  try {
    await pipeline(Readable.fromWeb(response.body), inspect, createWriteStream(temporary, { mode: 0o600, flags: 'wx' }));
    if (size !== object.sourceSize) throw new Error('Downloaded object size does not match source metadata');
    const sha256 = hash.digest('hex');
    await rename(temporary, destination);
    await writeFile(receiptPath, `${JSON.stringify({ sha256, size })}\n`, { mode: 0o600, flag: 'wx' });
    await chmod(destination, 0o600);
    return { ...receipt, sha256 };
  } finally {
    await rm(temporary, { force: true });
  }
}

async function main() {
  const environment = loadMigrationEnvironment();
  const baseUrl = validatedSupabaseSourceUrl(environment.SUPABASE_URL);
  const secret = environment.SUPABASE_SECRET_KEY;
  if (!secret?.startsWith('sb_secret_')) throw new Error('A current SUPABASE_SECRET_KEY is required');
  const [snapshot, admin] = await Promise.all([
    readFile(resolve(output, 'source-snapshot.json'), 'utf8').then(JSON.parse),
    readFile(resolve(output, 'source-admin.json'), 'utf8').then(JSON.parse),
  ]);
  const manifest = buildStorageManifest(snapshot, admin);
  await mkdir(objectsDirectory, { recursive: true, mode: 0o700 });
  await chmod(output, 0o700);
  const integrity = [];
  for (const object of manifest.objects) {
    if (!Number.isSafeInteger(object.sourceSize) || object.sourceSize < 0) throw new Error('Source object metadata has invalid size');
    integrity.push(await downloadObject(baseUrl, secret, object, { sourceBucket: object.sourceBucket }));
  }
  const verifiedManifest = { ...manifest, objects: manifest.objects.map((object, index) => ({ ...object, sha256: integrity[index].sha256 })) };
  await writeFile(resolve(output, 'storage-transfer-manifest.json'), `${JSON.stringify(verifiedManifest, null, 2)}\n`, { mode: 0o600 });
  console.log(`Verified ${integrity.length} local source objects; referenced objects blocked for review: ${manifest.objects.filter((object) => object.state === 'blocked').length}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
