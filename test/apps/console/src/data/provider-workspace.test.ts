import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { fixture, fixtureMoc, holdNextProviderRequest, resetProviderFixture, scopedCalls, WORKSPACE_A, WORKSPACE_B } from './provider-workspace-fixture'

vi.doMock('../../../../../apps/console/src/lib/moc-client', () => ({ moc: fixtureMoc }))
vi.doMock('../../../../../apps/console/src/data/current-workspace', () => ({ getCurrentWorkspaceId: async () => fixture.selectedWorkspace }))
const { createStream, updateStream, deleteStream } = await import('../../../../../apps/console/src/data/mutate-streams')
const { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting, deleteLocalZoomMeetingRecord } = await import('../../../../../apps/console/src/data/mutate-zoom')
const { fetchCategories, fetchPlaylists } = await import('../../../../../apps/console/src/data/fetch-streams')
const { uploadThumbnail } = await import('../../../../../apps/console/src/lib/youtube-api')
const { queueZoomMeetingOperation } = await import('../../../../../apps/console/src/data/zoom-meeting-operation-queue')

const streamParams: Parameters<typeof createStream>[0] = {
  title: 'Workspace A', description: '', privacyStatus: 'unlisted', isForKids: false, scheduledStartTime: null,
  categoryId: '22', tags: ['test'], latencyPreference: 'normal', enableDvr: true, enableEmbed: true,
  enableAutoStart: false, enableAutoStop: true, playlistId: 'playlist-a', thumbnail: null,
}
const meetingParams: Parameters<typeof createZoomMeeting>[0] = {
  topic: 'Workspace A', description: '', startTime: '2099-01-01T12:00:00.000Z', duration: 60, timezone: 'UTC',
  recurrenceType: 'none', recurrenceInterval: null, recurrenceDays: null, waitingRoom: true, muteOnEntry: true, continuousChat: false,
}
const stream = { ...streamParams, id: 'stream-a', workspaceId: WORKSPACE_A, youtubeBroadcastId: 'broadcast-a', thumbnailUrl: null } as Stream
const meeting = { ...meetingParams, id: 'meeting-a', workspaceId: WORKSPACE_A, zoomMeetingId: 101 } as ZoomMeeting

beforeEach(resetProviderFixture)
afterEach(() => vi.unstubAllGlobals())

test('YouTube create pins provider helpers, local persistence and confirmation reads across a workspace switch', async () => {
  const release = holdNextProviderRequest()
  const creating = createStream(streamParams)
  await vi.waitFor(() => expect(scopedCalls()).toHaveLength(1))
  fixture.selectedWorkspace = WORKSPACE_B
  release()
  const result = await creating
  expect(result.stream.workspaceId).toBe(WORKSPACE_A)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
  expect(scopedCalls().some(call => call.path.includes('/videos') && call.method === 'PUT')).toBe(true)
  expect(scopedCalls().some(call => call.path.includes('/playlistItems'))).toBe(true)
  const notification = fixture.calls.find(call => call.path.includes('/stream-created'))
  expect(notification?.body?.streamId).toBe(result.stream.id)
})

test('YouTube rollback stays in its originating workspace after local insertion fails', async () => {
  const release = holdNextProviderRequest()
  fixture.failInsert = true
  const creating = createStream(streamParams)
  const rejected = expect(creating).rejects.toThrow('Connection lost')
  await vi.waitFor(() => expect(scopedCalls()).toHaveLength(1))
  fixture.selectedWorkspace = WORKSPACE_B
  release()
  await rejected
  expect(scopedCalls().filter(call => call.method === 'DELETE')).toHaveLength(2)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
})

test('a lost insert acknowledgement confirms the committed row in the original workspace before cleanup', async () => {
  fixture.failInsert = true
  fixture.confirmedInsert = true
  const result = await createStream(streamParams, WORKSPACE_A)
  expect(result.stream.id).toBe(fixture.insertedId)
  expect(scopedCalls().some(call => call.method === 'DELETE')).toBe(false)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
})

test('Zoom create and rollback retain the selected workspace while a provider response is pending', async () => {
  fixture.failInsert = true
  const release = holdNextProviderRequest()
  const creating = createZoomMeeting(meetingParams)
  const rejected = expect(creating).rejects.toThrow('Connection lost')
  await vi.waitFor(() => expect(scopedCalls()).toHaveLength(1))
  fixture.selectedWorkspace = WORKSPACE_B
  release()
  await rejected
  expect(scopedCalls().filter(call => call.method === 'DELETE')).toHaveLength(1)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
})

test('editing and deleting existing provider records uses the records workspace rather than the current selection', async () => {
  fixture.selectedWorkspace = WORKSPACE_B
  await updateStream(stream)
  await deleteStream(stream)
  await updateZoomMeeting(meeting)
  await deleteZoomMeeting(meeting)
  expect(scopedCalls().length).toBeGreaterThan(6)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
})

test('YouTube local-update recovery sync is pinned to the edited record workspace', async () => {
  fixture.selectedWorkspace = WORKSPACE_B
  fixture.failNextStreamUpdate = true
  const result = await updateStream(stream)
  expect(result.reconciliationWarning).toBeNull()
  expect(scopedCalls().filter(call => call.body?.operation === 'updateStream')).toHaveLength(2)
  expect(scopedCalls().some(call => call.path.includes('broadcastStatus='))).toBe(true)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
})

test('stream option loaders use workspace context without treating its ID as a region code', async () => {
  fixture.selectedWorkspace = WORKSPACE_B
  await fetchCategories(WORKSPACE_A)
  await fetchPlaylists(WORKSPACE_A)
  expect(scopedCalls().every(call => call.workspaceId === WORKSPACE_A)).toBe(true)
  expect(scopedCalls()[0].path).toContain('regionCode=US')
  expect(scopedCalls()[0].path).not.toContain(`regionCode=${WORKSPACE_A}`)
})

test('a queued local Zoom deletion does not re-resolve the workspace when its turn starts', async () => {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => { release = resolve })
  const previous = queueZoomMeetingOperation(WORKSPACE_A, () => gate)
  const deletion = deleteLocalZoomMeetingRecord('meeting-a')
  await Promise.resolve()
  fixture.selectedWorkspace = WORKSPACE_B
  release()
  await Promise.all([previous, deletion])
  const call = scopedCalls().find(entry => entry.body?.operation === 'deleteZoomMeeting')
  expect(call?.workspaceId).toBe(WORKSPACE_A)
})


test('thumbnail upload retains its explicit workspace while image encoding is pending', async () => {
  let finishEncoding: () => void = () => undefined
  class Reader {
    result = 'data:image/png;base64,aW1hZ2U='
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    readAsDataURL(): void { finishEncoding = () => this.onload?.() }
  }
  vi.stubGlobal('FileReader', Reader)
  const uploading = uploadThumbnail('broadcast-a', new Blob(['image'], { type: 'image/png' }), WORKSPACE_A)
  fixture.selectedWorkspace = WORKSPACE_B
  finishEncoding()
  await uploading
  expect(scopedCalls()).toHaveLength(1)
  expect(scopedCalls()[0].workspaceId).toBe(WORKSPACE_A)
  expect(scopedCalls()[0].body?.image).toBe('aW1hZ2U=')
})
