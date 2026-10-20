import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Broadcast } from '@moc/types/broadcast/broadcast'

const saved: Broadcast = {
  id: 'broadcast', workspaceId: 'workspace', createdBy: 'user', kind: 'audio', slug: 'welcome',
  title: 'Welcome', description: '', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-20T00:00:01Z', items: [],
}
const create = vi.fn(async () => saved)
const update = vi.fn(async () => saved)
const getById = vi.fn(async () => { throw new Error('Read unavailable after commit') })
const upload = vi.fn(async () => ({ url: '/media/new.mp3', path: 'new.mp3', bucket: 'media' }))
const remove = vi.fn(async () => undefined)
vi.doMock('../../../../../apps/console/src/lib/moc-client', () => ({ moc: { broadcasts: { create, update, getById }, storage: { upload, remove } } }))
vi.doMock('@moc/utils/probe-media-file', () => ({ probeMediaFile: async () => ({ isDecodable: true, durationSeconds: 1 }) }))
const { createBroadcast, updateBroadcast } = await import('../../../../../apps/console/src/data/mutate-broadcasts')

beforeEach(() => { vi.clearAllMocks() })

describe('broadcast mutation completion', () => {
  test('returns the committed upload update directly without a fallible second read', async () => {
    const result = await updateBroadcast({
      id: saved.id, workspaceId: saved.workspaceId, expectedUpdatedAt: '2026-10-20T00:00:00Z',
      title: saved.title, description: saved.description, kind: saved.kind, currentItems: [],
      items: [{ source: 'upload', clientId: 'new', file: new File(['audio'], 'new.mp3', { type: 'audio/mpeg' }) }],
    })
    expect(result).toBe(saved)
    expect(upload).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(getById).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  test('returns the committed creation directly without reloading it', async () => {
    expect(await createBroadcast({ workspaceId: saved.workspaceId, title: saved.title, description: '', kind: 'audio', files: [] })).toBe(saved)
    expect(create).toHaveBeenCalledTimes(1)
    expect(getById).not.toHaveBeenCalled()
  })

  test('cleans new uploads if the version check rejects the save', async () => {
    update.mockRejectedValueOnce(new Error('This broadcast changed'))
    await expect(updateBroadcast({
      id: saved.id, workspaceId: saved.workspaceId, expectedUpdatedAt: 'stale',
      title: saved.title, description: '', kind: 'audio', currentItems: [],
      items: [{ source: 'upload', clientId: 'new', file: new File(['audio'], 'new.mp3', { type: 'audio/mpeg' }) }],
    })).rejects.toThrow('This broadcast changed')
    expect(remove).toHaveBeenCalledWith({ purpose: 'broadcast-audio', workspaceId: 'workspace', paths: ['new.mp3'] })
  })
})
