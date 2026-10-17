import { createStorageClient, readStorageManifest, loadMigrationEnvironment, localObjectPath, verifyLocalManifestObjects } from './storage-transfer-runtime.mjs';
import { putStorageObjectIfAbsent } from './storage-object-upload.mjs';

async function main() {
  const env = loadMigrationEnvironment();
  const manifest = await readStorageManifest();
  await verifyLocalManifestObjects(manifest);
  if (!process.argv.includes('--apply')) {
    console.log(`Validated ${manifest.objects.length} local objects. Add --apply only during an approved storage cutover.`);
    return;
  }
  const client = createStorageClient(env);
  try {
    for (const object of manifest.objects) await putStorageObjectIfAbsent(client, object, localObjectPath(object));
  } finally {
    await client.destroy();
  }
  console.log(`Uploaded and byte-verified ${manifest.objects.length} private objects.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
