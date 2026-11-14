import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'
import { partitionFiles } from '@moc/utils/file-constraints'
import { THUMBNAIL_MAX_SIZE_BYTES, THUMBNAIL_TOO_LARGE_MESSAGE } from '@moc/utils/blob-fetch'

const fetchImageBlob = vi.fn<(url: string, signal?: AbortSignal) => Promise<Blob>>()
const createObjectURL = vi.fn(() => 'blob:thumbnail')
const revokeObjectURL = vi.fn()
const emptyOptions: never[] = []
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('@moc/utils/blob-fetch', async importOriginal => ({ ...await importOriginal<typeof import('@moc/utils/blob-fetch')>(), fetchImageBlob }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast: vi.fn() }) }))
vi.doMock('../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: 'workspace' }) }))
vi.doMock('../../../../../../apps/console/src/lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.doMock('../../../../../../apps/console/src/features/streams/streams-provider', () => ({ useStreams: () => ({ state: { youtubeConnection: null } }) }))
vi.doMock('../../../../../../apps/console/src/data/fetch-streams', () => ({ fetchCategories: vi.fn(), fetchPlaylists: vi.fn() }))
vi.doMock('../../../../../../apps/console/src/hooks/use-workspace-resource', () => ({ useWorkspaceResource: () => ({ data: emptyOptions, isLoading: false, error: null }) }))
const { useStreamForm } = await import('../../../../../../apps/console/src/features/streams/use-stream-form')

function form(): HookRuntime<boolean, ReturnType<typeof useStreamForm>> {
  const runtime = new HookRuntime((open: boolean) => useStreamForm({ open, onOpenChange: vi.fn(), onSubmit: vi.fn() }))
  runtime.render(true)
  runtime.rerender().actions.updateThumbnailUrlInput('https://images.example.test/thumbnail.png')
  runtime.rerender().actions.handleThumbnailUrlConfirm()
  runtime.rerender()
  return runtime
}

beforeEach(() => {
  vi.resetAllMocks()
  createObjectURL.mockReturnValue('blob:thumbnail')
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  })
})
afterEach(() => vi.unstubAllGlobals())

test.each(['clear', 'close', 'unmount'])('late image fetch after %s cannot restore a thumbnail or allocate a blob URL', async (action) => {
  let resolve: (blob: Blob) => void = () => undefined
  fetchImageBlob.mockReturnValue(new Promise(next => { resolve = next }))
  const runtime = form()
  expect(fetchImageBlob).toHaveBeenCalledOnce()
  if (action === 'clear') {
    runtime.rerender().actions.clearThumbnail()
    runtime.rerender()
  } else if (action === 'close') runtime.render(false)
  else runtime.unmount()
  expect(fetchImageBlob.mock.calls[0][1]?.aborted).toBe(true)
  resolve(new Blob(['image'], { type: 'image/png' }))
  await Promise.resolve()
  expect(createObjectURL).not.toHaveBeenCalled()
  if (action !== 'unmount') {
    expect(runtime.rerender().state).toMatchObject({ thumbPreviewUrl: null, thumbStatus: 'idle' })
    runtime.unmount()
  }
})

test('a resolved preview is revoked when the thumbnail is removed', async () => {
  fetchImageBlob.mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
  const runtime = form()
  await Promise.resolve()
  expect(runtime.rerender().state.thumbPreviewUrl).toBe('blob:thumbnail')
  runtime.rerender().actions.clearThumbnail()
  runtime.rerender()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail')
  runtime.unmount()
})

test('a late submit result cannot reset or close a reopened stream form', async () => {
  let resolve: () => void = () => undefined
  let signal: AbortSignal | undefined
  const pending = new Promise<void>((next) => { resolve = next })
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn(async (params: { signal?: AbortSignal }) => { signal = params.signal; await pending })
  const runtime = new HookRuntime((open: boolean) => useStreamForm({ open, onOpenChange, onSubmit }))
  runtime.render(true)
  runtime.rerender().actions.updateTitle('First stream')
  const submitting = runtime.rerender().actions.handleSubmit()
  expect(signal).toHaveProperty('aborted', false)
  runtime.render(false)
  runtime.render(true)
  expect(signal).toHaveProperty('aborted', true)
  runtime.rerender().actions.updateTitle('New stream draft')
  resolve()
  await submitting
  expect(runtime.rerender().state.title).toBe('New stream draft')
  expect(onOpenChange).not.toHaveBeenCalled()
  runtime.unmount()
})


test('an insecure thumbnail link shows actionable validation without starting a download', () => {
  const runtime = new HookRuntime((open: boolean) => useStreamForm({ open, onOpenChange: vi.fn(), onSubmit: vi.fn() }))
  runtime.render(true)
  runtime.rerender().actions.updateThumbnailUrlInput('http://images.example.test/thumbnail.png')
  runtime.rerender().actions.handleThumbnailUrlConfirm()
  expect(runtime.rerender().state).toMatchObject({ thumbSelection: null, thumbStatus: 'error', thumbError: 'Use an HTTPS image link, or upload the image file directly.' })
  expect(fetchImageBlob).not.toHaveBeenCalled()
  runtime.unmount()
})

test('an oversized file batch shows its validation reason without selecting or downloading it', () => {
  const runtime = new HookRuntime((open: boolean) => useStreamForm({ open, onOpenChange: vi.fn(), onSubmit: vi.fn() }))
  runtime.render(true)
  const file = new File([new Uint8Array(THUMBNAIL_MAX_SIZE_BYTES + 1)], 'large.png', { type: 'image/png' })
  const batch = partitionFiles([file], { accept: 'image/jpeg,image/png', maxSizeBytes: THUMBNAIL_MAX_SIZE_BYTES })
  runtime.rerender().actions.handleThumbnailFilesChange(batch)

  expect(batch.acceptedFiles).toHaveLength(0)
  expect(runtime.rerender().state).toMatchObject({ thumbSelection: null, thumbStatus: 'error', thumbError: THUMBNAIL_TOO_LARGE_MESSAGE })
  expect(fetchImageBlob).not.toHaveBeenCalled()
  runtime.unmount()
})

test('an oversized URL response preserves actionable size guidance', async () => {
  fetchImageBlob.mockRejectedValue(new RangeError(THUMBNAIL_TOO_LARGE_MESSAGE))
  const runtime = form()
  await Promise.resolve()
  await Promise.resolve()

  expect(runtime.rerender().state).toMatchObject({ thumbStatus: 'error', thumbError: THUMBNAIL_TOO_LARGE_MESSAGE, thumbPreviewUrl: null })
  expect(createObjectURL).not.toHaveBeenCalled()
  runtime.unmount()
})
