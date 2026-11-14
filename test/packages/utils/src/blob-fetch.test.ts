import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { fetchImageBlob, imageDownloadUrl, INVALID_THUMBNAIL_URL_MESSAGE, THUMBNAIL_MAX_SIZE_BYTES, THUMBNAIL_TOO_LARGE_MESSAGE } from '../../../../packages/utils/src/blob-fetch'

beforeEach(() => vi.stubGlobal('location', { origin: 'https://console.example.test' }))
afterEach(() => vi.unstubAllGlobals())

test.each([
  'http://images.example.test/image.png',
  'javascript:alert(1)',
  'data:image/svg+xml,<svg/>',
  'file:///image.png',
  'blob:https://example.test/id',
  'https://person:password@images.example.test/image.png',
  'https:\\images.example.test/image.png',
  'https://images.example.test/\nimage.png',
  '',
])('rejects unsafe or insecure image download URL %s', async (url) => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(() => imageDownloadUrl(url)).toThrow(INVALID_THUMBNAIL_URL_MESSAGE)
  await expect(fetchImageBlob(url)).rejects.toThrow(INVALID_THUMBNAIL_URL_MESSAGE)
  expect(fetch).not.toHaveBeenCalled()
})

test('permits any HTTPS host and preserves API-owned relative preset links', () => {
  expect(imageDownloadUrl(' https://photos.example.test/image.png ')).toBe('https://photos.example.test/image.png')
  expect(imageDownloadUrl('/api/storage/media/preset.png')).toBe('https://console.example.test/api/storage/media/preset.png')
  expect(imageDownloadUrl('/api/storage/media/preset.png', 'http://localhost:5173')).toBe('http://localhost:5173/api/storage/media/preset.png')
  expect(imageDownloadUrl('http://localhost:5173/api/storage/media/preset.png', 'http://localhost:5173')).toBe('http://localhost:5173/api/storage/media/preset.png')
  expect(() => imageDownloadUrl('//images.example.test/image.png', 'http://localhost:5173')).toThrow(INVALID_THUMBNAIL_URL_MESSAGE)
})

test('downloads image bytes with cancellation and no cross-origin credentials or referrer', async () => {
  const blob = new Blob(['image'], { type: 'image/png' })
  const fetch = vi.fn().mockResolvedValue(new Response(blob))
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  const downloaded = await fetchImageBlob('https://photos.example.test/image.png', controller.signal)
  expect(await downloaded.text()).toBe('image')
  expect(fetch).toHaveBeenCalledWith('https://photos.example.test/image.png', { signal: controller.signal, credentials: 'same-origin', referrerPolicy: 'no-referrer' })
})

test('an already-cancelled image download never starts a request', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  controller.abort()
  await expect(fetchImageBlob('https://photos.example.test/image.png', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch).not.toHaveBeenCalled()
})

test('rejects an oversized Content-Length before reading and cancels the response', async () => {
  const cancel = vi.fn()
  const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new Uint8Array(1)))
  const body = new ReadableStream({ pull, cancel }, { highWaterMark: 0 })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers: { 'Content-Length': String(THUMBNAIL_MAX_SIZE_BYTES + 1) } })))

  await expect(fetchImageBlob('https://photos.example.test/large.png')).rejects.toThrow(THUMBNAIL_TOO_LARGE_MESSAGE)
  expect(pull).not.toHaveBeenCalled()
  expect(cancel).toHaveBeenCalledOnce()
})

test.each([undefined, '1'])('bounds streamed bytes when Content-Length is %s and cancels on overflow', async (declaredSize) => {
  const cancel = vi.fn()
  const chunks = [new Uint8Array(THUMBNAIL_MAX_SIZE_BYTES - 1), new Uint8Array(2), new Uint8Array(1024)]
  const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(chunks.shift()))
  const body = new ReadableStream({ pull, cancel }, { highWaterMark: 0 })
  const headers = declaredSize ? { 'Content-Length': declaredSize } : undefined
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers })))

  await expect(fetchImageBlob('https://photos.example.test/chunked.png')).rejects.toThrow(THUMBNAIL_TOO_LARGE_MESSAGE)
  expect(pull).toHaveBeenCalledTimes(2)
  expect(cancel).toHaveBeenCalledOnce()
  expect(chunks).toHaveLength(1)
})

test('accepts an image exactly at the app limit without rejecting stored octet-stream media', async () => {
  const body = new Uint8Array(THUMBNAIL_MAX_SIZE_BYTES)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'application/octet-stream' } })))

  const blob = await fetchImageBlob('/api/storage/media/preset.png')
  expect(blob.size).toBe(THUMBNAIL_MAX_SIZE_BYTES)
  expect(blob.type).toBe('application/octet-stream')
})
