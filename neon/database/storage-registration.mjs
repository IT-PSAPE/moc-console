async function verifyDomainOwnership(client, object) {
  if (object.purpose === 'avatar') {
    const result = await client.query('SELECT id FROM public.users WHERE id=$1', [object.ownerUserId]);
    if (result.rowCount !== 1) throw new Error('Avatar owner row is missing');
    return;
  }
  if (!object.purpose?.startsWith('broadcast-')) throw new Error('Unsupported registered storage purpose');
  const references = object.sourceReferences.filter((ref) => ref.table === 'broadcast_items');
  const result = await client.query(
    `SELECT 1 FROM public.broadcasts b JOIN public.broadcast_items i ON i.broadcast_id=b.id
      WHERE i.id=ANY($1::uuid[]) AND b.workspace_id=$2 AND b.created_by=$3`,
    [references.map((ref) => ref.id), object.workspaceId, object.ownerUserId],
  );
  if (result.rowCount !== references.length) throw new Error('Broadcast owner, workspace, or item rows do not match source references');
}

async function registerObject(client, object) {
  await verifyDomainOwnership(client, object);
  await client.query(
    `INSERT INTO moc_private.storage_objects
       (bucket,object_path,owner_user_id,workspace_id,purpose,byte_size,content_type,sha256)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (bucket,object_path) DO NOTHING`,
    [object.targetBucket, object.targetPath, object.ownerUserId, object.workspaceId, object.purpose,
      object.sourceSize, object.sourceContentType, object.sha256],
  );
  const result = await client.query(
    `SELECT owner_user_id,workspace_id,purpose,byte_size,content_type,sha256
       FROM moc_private.storage_objects WHERE bucket=$1 AND object_path=$2`,
    [object.targetBucket, object.targetPath],
  );
  const row = result.rows[0];
  if (result.rowCount !== 1 || row.owner_user_id !== object.ownerUserId || row.workspace_id !== object.workspaceId
      || row.purpose !== object.purpose || Number(row.byte_size) !== object.sourceSize
      || row.content_type !== object.sourceContentType || row.sha256 !== object.sha256) {
    throw new Error('Existing Storage registration conflicts with verified source metadata');
  }
}

async function rewriteDomainRow(client, change) {
  if (!['public.users', 'public.broadcast_items'].includes(change.table)) throw new Error('Manifest contains an unsupported rewrite table');
  if (!['avatar_url', 'public_url', 'storage_path', 'storage_bucket'].includes(change.column)) throw new Error('Manifest contains an unsupported rewrite column');
  const updated = await client.query(
    `UPDATE ${change.table} SET ${change.column}=$1 WHERE id=$2 AND ${change.column}=$3 RETURNING id`,
    [change.replacement, change.id, change.expected],
  );
  if (updated.rowCount === 1) return;
  const current = await client.query(`SELECT ${change.column} FROM ${change.table} WHERE id=$1`, [change.id]);
  if (current.rowCount !== 1 || current.rows[0][change.column] !== change.replacement) {
    throw new Error('Domain row changed from the source snapshot; URL rewrite is blocked');
  }
}

export async function registerStorageManifest(client, manifest) {
  for (const object of manifest.objects.filter((item) => item.state === 'registered')) {
    await registerObject(client, object);
    for (const change of object.rewrites) await rewriteDomainRow(client, change);
  }
  return manifest.objects.filter((item) => item.state === 'registered').length;
}
