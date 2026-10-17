import { createReadStream } from 'node:fs';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { sourceObjectMetadata } from './storage-object-metadata.mjs';
import { sha256File, verifyRemoteManifestObjects } from './storage-transfer-runtime.mjs';

function isPreconditionFailure(error) {
  return error?.$metadata?.httpStatusCode === 412 || error?.name === 'PreconditionFailed'
    || error?.name === 'ConditionalRequestConflict';
}

export async function putStorageObjectIfAbsent(client, object, path) {
  const local = await sha256File(path);
  if (local.size !== object.sourceSize || local.sha256 !== object.sha256) throw new Error('Local object differs from its protected manifest');
  const metadata = sourceObjectMetadata(object);
  try {
    await client.send(new PutObjectCommand({
      Bucket: object.targetBucket,
      Key: object.targetPath,
      Body: createReadStream(path),
      ContentLength: local.size,
      ContentType: object.sourceContentType,
      Metadata: metadata,
      IfNoneMatch: '*',
    }));
  } catch (error) {
    if (!isPreconditionFailure(error)) throw error;
    try {
      await verifyRemoteManifestObjects(client, { objects: [object] });
    } catch {
      throw new Error('Existing private object differs; refusing to overwrite');
    }
    return;
  }
  await verifyRemoteManifestObjects(client, { objects: [object] });
}
