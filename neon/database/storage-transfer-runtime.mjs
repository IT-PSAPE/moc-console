import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sourceObjectMetadata } from './storage-object-metadata.mjs';

export const projectRoot = resolve(process.cwd());
export const migrationDirectory = resolve(projectRoot, 'output/supabase-migration');
export const objectDirectory = resolve(migrationDirectory, 'objects');
export const manifestPath = resolve(migrationDirectory, 'storage-transfer-manifest.json');

export function loadMigrationEnvironment() {
  process.loadEnvFile(resolve(projectRoot, 'neon/.env.local'));
  return process.env;
}

export function createStorageClient(env = process.env) {
  if (!env.NEON_STORAGE_ENDPOINT || !env.NEON_STORAGE_ACCESS_KEY_ID || !env.NEON_STORAGE_SECRET_ACCESS_KEY) {
    throw new Error('Neon Storage credentials are not configured');
  }
  return new S3Client({
    endpoint: env.NEON_STORAGE_ENDPOINT,
    region: env.NEON_STORAGE_REGION ?? 'us-east-2',
    forcePathStyle: true,
    credentials: { accessKeyId: env.NEON_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.NEON_STORAGE_SECRET_ACCESS_KEY },
  });
}

export async function readStorageManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.objects) || manifest.objects.length !== 41
      || manifest.objects.some((object) => object.state === 'blocked')) {
    throw new Error('Protected Storage manifest is incomplete or contains unresolved references');
  }
  for (const object of manifest.objects) {
    if (!object.sha256 || !object.targetBucket || !object.targetPath || !Number.isSafeInteger(object.sourceSize)) {
      throw new Error('Storage manifest is missing integrity or target data');
    }
    sourceObjectMetadata(object);
  }
  return manifest;
}

export function localObjectPath(object) {
  if (typeof object.sourceBucket !== 'string' || typeof object.sourcePath !== 'string'
      || object.sourcePath.startsWith('/') || object.sourcePath.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Manifest contains an invalid source object path');
  }
  const path = resolve(objectDirectory, object.sourceBucket, ...object.sourcePath.split('/'));
  if (!path.startsWith(`${objectDirectory}${sep}`)) throw new Error('Manifest object path escapes protected output');
  return path;
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    size += chunk.length;
  }
  return { size, sha256: hash.digest('hex') };
}

export async function verifyLocalManifestObjects(manifest) {
  for (const object of manifest.objects) {
    const file = await sha256File(localObjectPath(object));
    if (file.size !== object.sourceSize || file.sha256 !== object.sha256) {
      throw new Error('Local object differs from protected manifest');
    }
  }
}

export async function verifyRemoteManifestObjects(client, manifest) {
  for (const object of manifest.objects) {
    const result = await client.send(new GetObjectCommand({ Bucket: object.targetBucket, Key: object.targetPath }));
    if (!result.Body) throw new Error('Private object is missing; database registration is blocked');
    const hash = createHash('sha256');
    let size = 0;
    for await (const chunk of result.Body) {
      hash.update(chunk);
      size += chunk.byteLength;
    }
    const metadata = await client.send(new HeadObjectCommand({ Bucket: object.targetBucket, Key: object.targetPath }));
    const expectedMetadata = sourceObjectMetadata(object);
    if (size !== object.sourceSize || hash.digest('hex') !== object.sha256
        || metadata.Metadata?.['source-storage-object'] !== expectedMetadata['source-storage-object']
        || metadata.Metadata?.['source-sha256'] !== expectedMetadata['source-sha256']) {
      throw new Error('Private object differs from verified source bytes or metadata');
    }
  }
}
