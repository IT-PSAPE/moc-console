import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../../apps/broadcast/src/features/test-hook-runtime'
import type { ShaderSurfaceRenderer } from '../../../../../packages/ui/src/services/shader-surface-renderer'

const createRenderer = vi.fn<() => ShaderSurfaceRenderer | null>()
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('../../../../../packages/ui/src/services/shader-surface-renderer', () => ({ createShaderSurfaceRenderer: createRenderer }))
const { useShaderSurface } = await import('../../../../../packages/ui/src/hooks/use-shader-surface')
const colors = ['--test-color']

class CanvasTarget extends EventTarget {
  dataset: Record<string, string> = {}
  getBoundingClientRect(): { width: number; height: number } { return { width: 1200, height: 240 } }
}
class MotionTarget extends EventTarget { matches = false }
class DocumentTarget extends EventTarget { hidden = false }
const disconnectResize = vi.fn()
const disconnectIntersection = vi.fn()
let intersectionChanged: IntersectionObserverCallback
class ResizeObserverMock {
  observe(): void {}
  disconnect(): void { disconnectResize() }
}
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) { intersectionChanged = callback }
  observe(): void {}
  disconnect(): void { disconnectIntersection() }
}
let canvas: CanvasTarget
let motion: MotionTarget
let documentTarget: DocumentTarget
let frames: Map<number, FrameRequestCallback>
let nextFrame = 0
let renderer: { render: ReturnType<typeof vi.fn>; resize: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }
let unmount: (() => void) | null = null

function useSurface(): React.RefObject<HTMLCanvasElement | null> {
  const ref = useShaderSurface('test shader', colors)
  ref.current = canvas as unknown as HTMLCanvasElement
  return ref
}
function mount(): void {
  const runtime = new HookRuntime(useSurface)
  runtime.render(undefined)
  unmount = () => runtime.unmount()
}
function advanceFrame(time: number): void {
  const callbacks = Array.from(frames.values())
  frames.clear()
  for (const callback of callbacks) callback(time)
}
function setIntersection(visible: boolean): void {
  intersectionChanged([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver)
}

beforeEach(() => {
  canvas = new CanvasTarget()
  motion = new MotionTarget()
  documentTarget = new DocumentTarget()
  frames = new Map()
  nextFrame = 0
  renderer = { render: vi.fn(), resize: vi.fn(), dispose: vi.fn() }
  createRenderer.mockReset().mockReturnValue(renderer)
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('window', { matchMedia: () => motion })
  vi.stubGlobal('document', documentTarget)
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  disconnectResize.mockClear()
  disconnectIntersection.mockClear()
})
afterEach(() => { unmount?.(); unmount = null; vi.restoreAllMocks(); vi.unstubAllGlobals() })

test('reduced motion renders one static frame and changes stop or resume animation', () => {
  motion.matches = true
  mount()
  advanceFrame(100)
  expect(renderer.render).toHaveBeenLastCalledWith(0)
  expect(canvas.dataset.ready).toBe('true')
  expect(frames.size).toBe(0)
  motion.matches = false
  motion.dispatchEvent(new Event('change'))
  advanceFrame(200)
  expect(renderer.render).toHaveBeenLastCalledWith(0.2)
  expect(frames.size).toBe(1)
  motion.matches = true
  motion.dispatchEvent(new Event('change'))
  advanceFrame(300)
  expect(renderer.render).toHaveBeenLastCalledWith(0)
  expect(frames.size).toBe(0)
})

test('the decorative intro stops after five seconds and remains still after returning to the page', () => {
  mount()
  advanceFrame(100)
  expect(frames.size).toBe(1)
  advanceFrame(5000)
  expect(renderer.render).toHaveBeenLastCalledWith(5)
  expect(frames.size).toBe(0)
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  advanceFrame(6000)
  expect(renderer.render).toHaveBeenLastCalledWith(5)
  expect(frames.size).toBe(0)
})

test('hidden and offscreen surfaces pause, coalesce resumes, and release resources on unmount', () => {
  mount()
  advanceFrame(100)
  setIntersection(false)
  expect(frames.size).toBe(0)
  setIntersection(true)
  setIntersection(true)
  expect(frames.size).toBe(1)
  documentTarget.hidden = true
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
  documentTarget.hidden = false
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(1)
  unmount?.()
  unmount = null
  expect(frames.size).toBe(0)
  expect(renderer.dispose).toHaveBeenCalledOnce()
  expect(disconnectResize).toHaveBeenCalledOnce()
  expect(disconnectIntersection).toHaveBeenCalledOnce()
  expect(canvas.dataset.ready).toBeUndefined()
  motion.dispatchEvent(new Event('change'))
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
})

test('context loss reveals the fallback and restoration recreates the renderer', () => {
  mount()
  advanceFrame(100)
  const lost = new Event('webglcontextlost', { cancelable: true })
  canvas.dispatchEvent(lost)
  expect(lost.defaultPrevented).toBe(true)
  expect(frames.size).toBe(0)
  expect(canvas.dataset.ready).toBeUndefined()
  expect(renderer.dispose).toHaveBeenCalledOnce()
  const restored = { render: vi.fn(), resize: vi.fn(), dispose: vi.fn() }
  createRenderer.mockReturnValueOnce(restored)
  canvas.dispatchEvent(new Event('webglcontextrestored'))
  advanceFrame(200)
  expect(createRenderer).toHaveBeenCalledTimes(2)
  expect(restored.resize).toHaveBeenCalledWith(1200, 240)
  expect(restored.render).toHaveBeenCalledOnce()
  expect(canvas.dataset.ready).toBe('true')
})

test.each(['unavailable', 'throws'])('renderer failure (%s) keeps the static fallback and schedules no animation', failure => {
  if (failure === 'throws') createRenderer.mockImplementationOnce(() => { throw new Error('WebGL disabled') })
  else createRenderer.mockReturnValueOnce(null)
  expect(mount).not.toThrow()
  expect(canvas.dataset.ready).toBeUndefined()
  expect(frames.size).toBe(0)
})
