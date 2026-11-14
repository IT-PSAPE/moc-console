import * as React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Stream } from '@moc/types/streams/stream'
import type { Request } from '@moc/types/requests'
import type { StreamFormData } from '../../../../../../apps/console/src/features/streams/use-stream-form'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'

let workspaceId = 'workspace-a'
let role = { can_read: true, can_create: true, can_update: true, can_delete: true }
const toast = vi.fn()
const syncStream = vi.fn()
const uploadStreamThumbnail = vi.fn<(blob: Blob, options: { workspaceId: string; signal: AbortSignal }) => Promise<string>>()
const saveStreamPreset = vi.fn()
const createStream = vi.fn()
const loadYouTubeConnection = vi.fn(async () => undefined)
const loadZoomConnection = vi.fn(async () => undefined)
const emptyAction = vi.fn(async () => undefined)
const providerActions = { clear: vi.fn(), record: vi.fn() }

vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast }) }))
vi.doMock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: workspaceId, role }) }))
vi.doMock('../../../../../../apps/console/src/data/mutate-streams', () => ({ createStream, uploadStreamThumbnail, saveStreamPreset, deleteStream: emptyAction, updateStream: emptyAction, syncStreamsFromYouTube: emptyAction }))
vi.doMock('../../../../../../apps/console/src/data/mutate-zoom', () => ({ createZoomMeeting: vi.fn() }))
vi.doMock('../../../../../../apps/console/src/features/checklists/checklists-provider', () => ({ useChecklists: () => ({ actions: { createBlankChecklist: emptyAction } }) }))
vi.doMock('../../../../../../apps/console/src/features/streams/use-provider-sync', () => ({ useProviderSync: () => ({ state: {}, actions: { sync: emptyAction } }) }))
vi.doMock('../../../../../../apps/console/src/features/streams/use-provider-failure', () => ({ useProviderFailure: () => ({ actions: providerActions, state: {}, meta: {} }) }))
vi.doMock('../../../../../../apps/console/src/features/streams/use-stream-filters', () => ({ useStreamFilters: () => ({ setSearch: vi.fn() }) }))
vi.doMock('../../../../../../apps/console/src/features/streams/streams-provider', () => ({ useStreams: () => ({
  state: { streams: [], youtubeConnection: { status: 'active' }, zoomConnection: { status: 'active' } },
  actions: { syncStream, syncMeeting: emptyAction, loadStreams: emptyAction, loadYouTubeConnection, loadZoomConnection, removeStream: emptyAction, setStreams: emptyAction, setYouTubeConnection: emptyAction },
}) }))
const { useYouTubeStreams } = await import('../../../../../../apps/console/src/features/streams/use-youtube-streams')
const { useRequestWorkActions } = await import('../../../../../../apps/console/src/features/request-links/use-request-work-actions')

const fields: StreamFormData = {
  title: 'Service', description: '', privacyStatus: 'unlisted', isForKids: false, scheduledStartTime: null,
  categoryId: null, tags: [], latencyPreference: 'normal', enableDvr: true, enableEmbed: true, enableAutoStart: false, enableAutoStop: true,
  playlistId: null, thumbnail: { blob: new Blob(['image']), origin: 'file', sourceUrl: null }, notifyDestinations: [], savePreset: true,
}
const stream: Stream = {
  ...fields, id: 'stream', workspaceId: 'workspace-a', youtubeBroadcastId: 'yt', youtubeStreamId: 'ingest', thumbnailUrl: null,
  actualStartTime: null, actualEndTime: null, streamStatus: 'created', streamUrl: null, streamKey: null, ingestionUrl: null,
  createdBy: 'user', createdAt: '', updatedAt: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  workspaceId = 'workspace-a'
  role = { can_read: true, can_create: true, can_update: true, can_delete: true }
  createStream.mockResolvedValue({ stream, thumbnailError: null, reconciliationWarning: null })
})

test.each(['can_read', 'can_create', 'can_update'] as const)('Streams creation rejects a role missing %s before provider mutations', async permission => {
  role = { ...role, [permission]: false }
  const runtime = new HookRuntime(useYouTubeStreams)
  const hook = runtime.render('')
  expect(hook.meta.canCreate).toBe(false)
  await expect(hook.actions.create(fields)).rejects.toThrow('read, create, and update permission')
  expect(createStream).not.toHaveBeenCalled()
  expect(uploadStreamThumbnail).not.toHaveBeenCalled()
  expect(saveStreamPreset).not.toHaveBeenCalled()
  runtime.unmount()
})

test.each(['can_read', 'can_create', 'can_update'] as const)('request-linked creation rejects a role missing %s before provider mutations', async permission => {
  role = { ...role, [permission]: false }
  const runtime = new HookRuntime(useRequestWorkActions)
  const hook = runtime.render({ request: { id: 'request' } as Request, enabled: true, refreshRecords: emptyAction })
  expect(hook.meta.youtubeAvailable).toBe(false)
  expect(hook.meta.zoomAvailable).toBe(role.can_read && role.can_create)
  await expect(hook.actions.createYouTube(fields)).rejects.toThrow('read, create, and update permission')
  expect(createStream).not.toHaveBeenCalled()
  expect(loadYouTubeConnection).not.toHaveBeenCalled()
  expect(saveStreamPreset).not.toHaveBeenCalled()
  runtime.unmount()
})

test('both YouTube creation entrypoints allow read, create, update without requiring delete', async () => {
  role = { ...role, can_delete: false }
  const input = { ...fields, thumbnail: null, savePreset: false }
  const streams = new HookRuntime(useYouTubeStreams)
  const streamHook = streams.render('')
  expect(streamHook.meta.canCreate).toBe(true)
  await streamHook.actions.create(input)
  const linked = new HookRuntime(useRequestWorkActions)
  const linkedHook = linked.render({ request: { id: 'request' } as Request, enabled: true, refreshRecords: emptyAction })
  expect(linkedHook.meta.youtubeAvailable).toBe(true)
  await linkedHook.actions.createYouTube(input)
  expect(createStream).toHaveBeenCalledTimes(2)
  expect(createStream).toHaveBeenLastCalledWith({ ...input, requestId: 'request' }, 'workspace-a')
  streams.unmount()
  linked.unmount()
})

test.each(['workspace', 'unmount'])('ending the %s scope cancels thumbnail storage and prevents preset/success followups', async (action) => {
  let resolve: (url: string) => void = () => undefined
  uploadStreamThumbnail.mockReturnValue(new Promise((next) => { resolve = next }))
  const runtime = new HookRuntime(useYouTubeStreams)
  const hook = runtime.render('')
  const creating = hook.actions.create(fields)
  const rejected = expect(creating).rejects.toMatchObject({ name: 'AbortError' })
  for (let tick = 0; tick < 6; tick += 1) await Promise.resolve()
  expect(uploadStreamThumbnail).toHaveBeenCalledOnce()
  const options = uploadStreamThumbnail.mock.calls[0]?.[1]
  expect(options?.workspaceId).toBe('workspace-a')
  if (action === 'workspace') { workspaceId = 'workspace-b'; runtime.rerender() }
  else runtime.unmount()
  expect(options?.signal.aborted).toBe(true)
  resolve('/api/storage/media/thumbnail.png')
  await rejected
  expect(saveStreamPreset).not.toHaveBeenCalled()
  expect(toast).not.toHaveBeenCalled()
  if (action === 'workspace') runtime.unmount()
})
