const uploadPurposeByBucket = new Map([
  ['avatars', 'avatar'],
  ['broadcast-media', null],
  ['media', null],
]);

function tableRows(snapshot, name) {
  const table = snapshot.tables.find((entry) => entry.name === name);
  if (!table) throw new Error(`Snapshot is missing public.${name}`);
  return table.rows;
}

function pathFromPublicUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.indexOf('object');
    if (marker < 0 || parts[marker + 1] !== 'public' || parts.length <= marker + 3) return null;
    return { bucket: decodeURIComponent(parts[marker + 2]), path: parts.slice(marker + 3).map(decodeURIComponent).join('/') };
  } catch {
    return null;
  }
}

function references(snapshot) {
  const refs = new Map();
  const add = (table, row, column) => {
    const value = row[column];
    const parsed = pathFromPublicUrl(value);
    if (!parsed) return;
    const key = `${parsed.bucket}\0${parsed.path}`;
    const list = refs.get(key) ?? [];
    list.push({ table, row, column, sourceUrl: value });
    refs.set(key, list);
  };
  for (const row of tableRows(snapshot, 'users')) add('users', row, 'avatar_url');
  for (const row of tableRows(snapshot, 'broadcast_items')) add('broadcast_items', row, 'public_url');
  for (const row of tableRows(snapshot, 'streams')) add('streams', row, 'thumbnail_url');
  for (const row of tableRows(snapshot, 'equipment')) add('equipment', row, 'thumbnail_url');
  return refs;
}

function fileExtension(path) {
  const ext = path.split('/').at(-1)?.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  return ext?.toLowerCase() ?? 'bin';
}

export function buildStorageManifest(snapshot, admin) {
  if (!Array.isArray(admin.storageObjects) || !Array.isArray(admin.storageBuckets)) throw new Error('Storage inventory is missing');
  const userIds = new Set(tableRows(snapshot, 'users').map((row) => row.id));
  const workspaceIds = new Set(tableRows(snapshot, 'workspaces').map((row) => row.id));
  const broadcasts = new Map(tableRows(snapshot, 'broadcasts').map((row) => [row.id, row]));
  const inventory = new Map(admin.storageBuckets.map((bucket) => [bucket.id, bucket]));
  const refs = references(snapshot);
  const objects = admin.storageObjects.map((source) => {
    const bucket = inventory.get(source.bucket_id);
    if (!bucket || bucket.public !== true || typeof source.name !== 'string') throw new Error('Invalid source Storage object');
    const sourcePath = source.name;
    const ownerUserId = source.owner_id && userIds.has(source.owner_id) ? source.owner_id : null;
    const segments = sourcePath.split('/');
    const linked = refs.get(`${bucket.id}\0${sourcePath}`) ?? [];
    let workspaceId = null;
    let purpose = uploadPurposeByBucket.get(bucket.id) ?? null;
    if (bucket.id === 'broadcast-media') {
      const broadcastRef = linked.find((item) => item.table === 'broadcast_items');
      const domainItem = broadcastRef?.row;
      const broadcast = domainItem ? broadcasts.get(domainItem.broadcast_id) : null;
      if (broadcast && workspaceIds.has(broadcast.workspace_id) && ownerUserId && broadcast.created_by === ownerUserId) {
        workspaceId = broadcast.workspace_id;
        purpose = source.metadata?.mimetype?.startsWith('audio/') ? 'broadcast-audio'
          : source.metadata?.mimetype?.startsWith('video/') ? 'broadcast-video' : null;
      }
    } else if (bucket.id === 'media' && segments.length === 3 && segments[1] === 'stream-thumbnails'
      && workspaceIds.has(segments[0]) && ownerUserId && segments[2]) {
      workspaceId = segments[0];
      purpose = 'stream-thumbnail';
    } else if (bucket.id === 'avatars' && ownerUserId && segments[0] === ownerUserId && segments.length === 2) {
      purpose = 'avatar';
    }
    const appReferenced = linked.length > 0;
    const resolved = Boolean(ownerUserId && purpose && (purpose === 'avatar' ? !workspaceId : workspaceId));
    const supportedReferences = bucket.id === 'avatars'
      ? linked.every((ref) => ref.table === 'users' && ref.row.id === ownerUserId && ref.column === 'avatar_url')
      : bucket.id === 'broadcast-media'
        ? linked.every((ref) => {
          const broadcast = ref.table === 'broadcast_items' ? broadcasts.get(ref.row.broadcast_id) : null;
          return Boolean(broadcast && broadcast.workspace_id === workspaceId && broadcast.created_by === ownerUserId
            && ref.column === 'public_url' && purpose?.startsWith('broadcast-'));
        })
        : false;
    const blocked = appReferenced && (!resolved || !supportedReferences);
    const registered = appReferenced && resolved && supportedReferences;
    const state = blocked ? 'blocked' : registered ? 'registered' : 'archived';
    const targetPath = registered ? null : `supabase-migration/${bucket.id}/${sourcePath}`;
    let finalTargetPath = targetPath;
    if (registered) {
      const filename = segments.at(-1);
      const folder = purpose === 'avatar' ? `${ownerUserId}/avatars`
        : `${workspaceId}/${ownerUserId}/${purpose === 'stream-thumbnail' ? 'stream-thumbnails' : 'broadcast-media'}`;
      finalTargetPath = `moc-uploads/${folder}/${filename}`;
    }
    const rewrites = [];
    for (const ref of linked) {
      if (!registered || !finalTargetPath) continue;
      if (ref.table === 'users' && ref.row.id === ownerUserId && purpose === 'avatar') {
        rewrites.push({ table: 'public.users', id: ref.row.id, column: 'avatar_url', expected: ref.sourceUrl,
          replacement: `/api/storage/avatars/${finalTargetPath.split('/').map(encodeURIComponent).join('/')}` });
      } else if (ref.table === 'broadcast_items' && purpose?.startsWith('broadcast-')) {
        const broadcast = broadcasts.get(ref.row.broadcast_id);
        if (broadcast?.workspace_id === workspaceId && broadcast.created_by === ownerUserId) {
          const url = `/api/storage/broadcast-media/${finalTargetPath.split('/').map(encodeURIComponent).join('/')}`;
          rewrites.push({ table: 'public.broadcast_items', id: ref.row.id, column: 'public_url', expected: ref.sourceUrl, replacement: url,
            storageBucket: 'broadcast-media', storagePath: finalTargetPath });
          rewrites.push({ table: 'public.broadcast_items', id: ref.row.id, column: 'storage_path', expected: ref.row.storage_path, replacement: finalTargetPath });
          if (ref.row.storage_bucket !== 'broadcast-media') {
            rewrites.push({ table: 'public.broadcast_items', id: ref.row.id, column: 'storage_bucket', expected: ref.row.storage_bucket, replacement: 'broadcast-media' });
          }
        }
      }
    }
    return {
      sourceBucket: bucket.id,
      sourcePath,
      sourceSize: Number(source.metadata?.size ?? source.metadata?.contentLength),
      sourceContentType: source.metadata?.mimetype ?? 'application/octet-stream',
      ownerUserId,
      workspaceId,
      purpose,
      targetBucket: bucket.id,
      targetPath: finalTargetPath,
      state,
      sourceReferences: linked.map(({ table, row, column }) => ({ table, id: row.id, column })),
      rewrites,
      extension: fileExtension(sourcePath),
      sourceObject: source,
    };
  });
  const publicBuckets = [...inventory.values()].filter((bucket) => bucket.public === true);
  if (publicBuckets.length !== 3) throw new Error('Unexpected source Storage inventory size');
  return { version: 1, targetBuckets: ['avatars', 'media', 'broadcast-media'], objects };
}
