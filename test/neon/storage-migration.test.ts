import { describe, expect, it } from 'vitest'

const { buildStorageManifest } = await import('../../neon/database/storage-migration.mjs') as {
  buildStorageManifest: (snapshot: unknown, admin: unknown) => {
    objects: Array<Record<string, unknown>>
  }
}
const { sourceObjectMetadata } = await import('../../neon/database/storage-object-metadata.mjs') as {
  sourceObjectMetadata: (object: Record<string, unknown>) => Record<string, string>
}

const owner = '11111111-1111-4111-8111-111111111111'
const workspace = '22222222-2222-4222-8222-222222222222'
const broadcastId = '33333333-3333-4333-8333-333333333333'

function snapshot(overrides: Record<string, unknown[]> = {}) {
  const tables = {
    users: [{ id: owner, avatar_url: `https://source.invalid/storage/v1/object/public/avatars/${owner}/avatar.png` }],
    workspaces: [{ id: workspace }],
    broadcasts: [{ id: broadcastId, workspace_id: workspace, created_by: owner }],
    broadcast_items: [{ id: 'item-1', broadcast_id: broadcastId, storage_bucket: 'broadcast-media', storage_path: `${workspace}/${owner}/old/audio.mp3`, public_url: `https://source.invalid/storage/v1/object/public/broadcast-media/${workspace}/${owner}/old/audio.mp3` }],
    streams: [],
    equipment: [],
  }
  return { tables: Object.entries({ ...tables, ...overrides }).map(([name, rows]) => ({ name, rows })) }
}

function admin(objects: Record<string, unknown>[]) {
  return {
    storageBuckets: ['avatars', 'broadcast-media', 'media'].map((id) => ({ id, public: true })),
    storageObjects: objects,
  }
}

function sourceObject(bucket_id: string, name: string, overrides: Record<string, unknown> = {}) {
  return { bucket_id, name, owner_id: owner, metadata: { size: 3, mimetype: 'image/png' }, ...overrides }
}

describe('Supabase Storage migration manifest', () => {
  it('maps proven avatar and broadcast references to private API paths with exact row preconditions', () => {
    const path = `${workspace}/${owner}/old/audio.mp3`
    const result = buildStorageManifest(snapshot(), admin([
      sourceObject('avatars', `${owner}/avatar.png`),
      sourceObject('broadcast-media', path, { metadata: { size: 3, mimetype: 'audio/mpeg' } }),
    ]))
    expect(result.objects[0]).toMatchObject({ state: 'registered', ownerUserId: owner, workspaceId: null, purpose: 'avatar', targetBucket: 'avatars' })
    expect(result.objects[0].rewrites).toHaveLength(1)
    expect(result.objects[1]).toMatchObject({ state: 'registered', ownerUserId: owner, workspaceId: workspace, purpose: 'broadcast-audio' })
    expect(result.objects[1].rewrites).toHaveLength(2)
    expect(result.objects[1].rewrites).toContainEqual(expect.objectContaining({ table: 'public.broadcast_items', column: 'storage_path', expected: path }))
  })

  it('archives unreferenced objects without creating app ownership or purpose', () => {
    const item = sourceObject('media', `${workspace}/playlist-thumbnails/preview.png`, { owner_id: null })
    const result = buildStorageManifest(snapshot(), admin([item])).objects[0]
    expect(result).toMatchObject({ state: 'archived', ownerUserId: null, workspaceId: null, purpose: null, targetBucket: 'media' })
    expect(result.targetPath).toContain('supabase-migration/media/')
    expect(result.rewrites).toEqual([])
  })

  it('blocks a referenced object when owner or purpose cannot be proven', () => {
    const path = `${workspace}/${owner}/old/audio.mp3`
    const result = buildStorageManifest(snapshot(), admin([
      sourceObject('broadcast-media', path, { owner_id: null, metadata: { size: 3, mimetype: 'application/octet-stream' } }),
    ])).objects[0]
    expect(result).toMatchObject({ state: 'blocked', targetPath: expect.any(String), rewrites: [] })
    expect(result.sourceReferences).toHaveLength(1)
  })

  it('blocks referenced stream thumbnails until the app rewrite contract is implemented', () => {
    const path = `${workspace}/stream-thumbnails/preview.png`
    const fixture = snapshot({
      streams: [{ id: 'stream-1', workspace_id: workspace, created_by: owner,
        thumbnail_url: `https://source.invalid/storage/v1/object/public/media/${path}` }],
    })
    const result = buildStorageManifest(fixture, admin([
      sourceObject('media', path, { metadata: { size: 3, mimetype: 'image/png' } }),
    ])).objects[0]
    expect(result).toMatchObject({ state: 'blocked', purpose: 'stream-thumbnail', rewrites: [] })
    expect(result.sourceReferences).toHaveLength(1)
  })

  it('preserves original storage object metadata within the S3 user-metadata budget', () => {
    const result = buildStorageManifest(snapshot(), admin([sourceObject('media', 'legacy/file.png')])).objects[0]
    result.sha256 = 'a'.repeat(64)
    const metadata = sourceObjectMetadata(result)
    expect(Buffer.from(metadata['source-storage-object'], 'base64').toString('utf8')).toContain('legacy/file.png')
    expect(metadata['source-sha256']).toBe('a'.repeat(64))
  })
})
