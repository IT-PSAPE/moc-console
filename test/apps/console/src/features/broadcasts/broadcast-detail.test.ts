import * as React from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Broadcast } from '@moc/types/broadcast/broadcast'
import type { UpdateBroadcastParams } from '../../../../../../apps/console/src/data/mutate-broadcasts'
import { createMockReactModule, HookRuntime } from '../../../../broadcast/src/features/test-hook-runtime'

type Update = Omit<UpdateBroadcastParams, 'workspaceId'>
const updateBroadcast = vi.fn<(params: Update) => Promise<Broadcast>>()
const toast = vi.fn()
let canUpdate = true
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('../../../../../../apps/console/src/features/broadcasts/broadcasts-provider', () => ({
  useBroadcasts: () => ({ actions: { updateBroadcast }, meta: { canUpdate } }),
}))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast }) }))
vi.doMock('../../../../../../apps/console/src/hooks/use-copy-feedback', () => ({
  useCopyFeedback: () => ({ state: {}, actions: { copy: vi.fn() } }),
}))
const { useBroadcastDetail } = await import('../../../../../../apps/console/src/features/broadcasts/use-broadcast-detail')

function broadcast(): Broadcast {
  return {
    id: 'broadcast', workspaceId: 'workspace', createdBy: 'user', kind: 'audio', slug: 'welcome',
    title: 'Welcome', description: 'Music', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z',
    items: ['first', 'second', 'third'].map((id, sortOrder) => ({
      id, broadcastId: 'broadcast', title: `${id}.mp3`, sortOrder, storageBucket: 'media', storagePath: `${id}.mp3`,
      publicUrl: `/media/${id}.mp3`, mimeType: 'audio/mpeg', fileSizeBytes: 2048, durationSeconds: 30, createdAt: '2026-10-01T00:00:00Z',
    })),
  }
}

async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

function mount(value = broadcast()) {
  const runtime = new HookRuntime(useBroadcastDetail)
  runtime.render(value)
  return runtime
}

beforeEach(() => {
  vi.clearAllMocks()
  canUpdate = true
  updateBroadcast.mockImplementation(async (params) => ({ ...broadcast(), title: params.title, description: params.description, updatedAt: '2026-10-20T00:00:01Z' }))
})

describe('broadcast detail editing', () => {
  test('saves inline metadata with the complete playlist and current version', async () => {
    const runtime = mount()
    runtime.rerender().actions.saveTitle(' Updated title ')
    await settle()
    expect(updateBroadcast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Updated title', description: 'Music', expectedUpdatedAt: '2026-10-20T00:00:00Z',
      currentItems: broadcast().items,
      items: ['first', 'second', 'third'].map((id) => ({ id, source: 'existing' })),
    }))
    runtime.unmount()
  })

  test('allows clearing the description and uses the saved version for the next edit', async () => {
    const runtime = mount()
    runtime.rerender().actions.saveDescription('')
    await settle()
    runtime.rerender().actions.saveTitle('Renamed')
    await settle()
    expect(updateBroadcast).toHaveBeenLastCalledWith(expect.objectContaining({ description: '', expectedUpdatedAt: '2026-10-20T00:00:01Z' }))
    runtime.unmount()
  })

  test('shows reordered rows immediately and rolls back if saving fails', async () => {
    let rejectSave: (reason: Error) => void = () => undefined
    updateBroadcast.mockReturnValueOnce(new Promise<Broadcast>((_resolve, reject) => { rejectSave = reject }))
    const runtime = mount()
    runtime.rerender().actions.reorderItem('existing:third', 'existing:first')
    expect(runtime.rerender().meta.itemKeys).toEqual(['existing:third', 'existing:first', 'existing:second'])
    rejectSave(new Error('This broadcast changed. Refresh and try again.'))
    await settle()
    expect(runtime.rerender().meta.itemKeys).toEqual(['existing:first', 'existing:second', 'existing:third'])
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', description: 'This broadcast changed. Refresh and try again.' }))
    runtime.unmount()
  })

  test('prevents concurrent reorder or removal from sending stale updates', async () => {
    let finishSave: (value: Broadcast) => void = () => undefined
    updateBroadcast.mockReturnValueOnce(new Promise<Broadcast>((resolve) => { finishSave = resolve }))
    const runtime = mount()
    runtime.rerender().actions.reorderItem('existing:third', 'existing:first')
    runtime.rerender().actions.removeItem('existing:second')
    runtime.rerender().actions.reorderItem('existing:second', 'existing:first')
    expect(updateBroadcast).toHaveBeenCalledTimes(1)
    finishSave(broadcast())
    await settle()
    runtime.unmount()
  })

  test('removes only the selected item and preserves the others', async () => {
    const runtime = mount()
    runtime.rerender().actions.removeItem('existing:second')
    await settle()
    expect(updateBroadcast).toHaveBeenCalledWith(expect.objectContaining({ items: [{ id: 'first', source: 'existing' }, { id: 'third', source: 'existing' }] }))
    runtime.unmount()
  })

  test('keeps the final file and prevents unauthorized writes', async () => {
    const value = broadcast()
    value.items = value.items.slice(0, 1)
    const runtime = mount(value)
    runtime.rerender().actions.removeItem('existing:first')
    expect(updateBroadcast).not.toHaveBeenCalled()
    canUpdate = false
    runtime.rerender().actions.saveTitle('Blocked')
    await settle()
    expect(updateBroadcast).not.toHaveBeenCalled()
    runtime.unmount()
  })

  test('appends saved uploads without replacing existing playlist items', async () => {
    const runtime = mount()
    const file = new File(['audio'], 'new.mp3', { type: 'audio/mpeg' })
    const onUploadStatusChange = vi.fn()
    await runtime.rerender().actions.submitUploads({ items: [{ source: 'upload', key: 'upload-1', file, status: 'queued' }], onUploadStatusChange })
    expect(updateBroadcast).toHaveBeenCalledWith(expect.objectContaining({
      items: [...['first', 'second', 'third'].map((id) => ({ id, source: 'existing' })), { source: 'upload', clientId: 'upload-1', file }],
      onUploadStatusChange,
    }))
    runtime.unmount()
  })
})
