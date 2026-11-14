import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { HookRuntime, createMockReactModule } from '../../../broadcast/src/features/test-hook-runtime'

vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
const { useQrScanner } = await import('../../../../../apps/console/src/hooks/use-qr-scanner')

const detect = vi.fn<() => Promise<Array<{ rawValue: string }>>>()
const formats = vi.fn<() => Promise<string[]>>()
const stop = vi.fn()
const play = vi.fn<() => Promise<void>>()
const onDetected = vi.fn()
const getUserMedia = vi.fn()
let tick: (() => void) | null = null

class Detector {
  static getSupportedFormats = formats
  detect = detect
}

function scanner(): HookRuntime<void, ReturnType<typeof useQrScanner>> {
  const runtime = new HookRuntime(() => useQrScanner({ onDetected }))
  const first = runtime.render()
  first.meta.videoRef.current = { readyState: 2, srcObject: null, play, pause: vi.fn() } as unknown as HTMLVideoElement
  first.actions.openScanner()
  runtime.rerender()
  return runtime
}

beforeEach(() => {
  vi.resetAllMocks()
  tick = null
  formats.mockResolvedValue(['qr_code'])
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] })
  play.mockResolvedValue()
  detect.mockResolvedValue([])
  vi.stubGlobal('window', { BarcodeDetector: Detector, setInterval: (callback: () => void) => { tick = callback; return 1 }, clearInterval: vi.fn() })
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 })
})
afterEach(() => vi.unstubAllGlobals())

test.each(['close', 'unmount'])('ignores a detected QR that resolves after %s', async (action) => {
  let resolve: (codes: Array<{ rawValue: string }>) => void = () => undefined
  detect.mockReturnValue(new Promise(next => { resolve = next }))
  const runtime = scanner()
  await vi.waitFor(() => expect(tick).not.toBeNull())
  tick?.()
  if (action === 'close') {
    runtime.rerender().actions.closeScanner()
    runtime.rerender()
  } else runtime.unmount()
  resolve([{ rawValue: 'equipment-qr' }])
  await Promise.resolve()
  expect(onDetected).not.toHaveBeenCalled()
  expect(stop).toHaveBeenCalled()
  if (action === 'close') runtime.unmount()
})

test('format discovery failures leave a recoverable error rather than a permanent spinner', async () => {
  formats.mockRejectedValue(new Error('Unavailable detector'))
  const runtime = scanner()
  await vi.waitFor(() => expect(runtime.rerender().state.isStarting).toBe(false))
  expect(runtime.rerender().state.error).toContain('Camera access is unavailable')
  expect(getUserMedia).not.toHaveBeenCalled()
  runtime.unmount()
})

test('closing during format discovery never requests a camera', async () => {
  let resolve: (value: string[]) => void = () => undefined
  formats.mockReturnValue(new Promise(next => { resolve = next }))
  const runtime = scanner()
  runtime.rerender().actions.closeScanner()
  runtime.rerender()
  resolve(['qr_code'])
  await Promise.resolve()
  expect(getUserMedia).not.toHaveBeenCalled()
  runtime.unmount()
})

test('preview playback failures release the camera and expose retry guidance', async () => {
  play.mockRejectedValue(new Error('Playback denied'))
  const runtime = scanner()
  await vi.waitFor(() => expect(runtime.rerender().state.isStarting).toBe(false))
  expect(runtime.rerender().state.error).toContain('Camera access is unavailable')
  expect(stop).toHaveBeenCalled()
  expect(tick).toBeNull()
  runtime.unmount()
})
