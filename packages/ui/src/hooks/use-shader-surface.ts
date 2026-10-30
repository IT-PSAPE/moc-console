import { useEffect, useRef, type RefObject } from 'react'
import { createShaderSurfaceRenderer, type ShaderSurfaceRenderer } from '../services/shader-surface-renderer'

export function useShaderSurface(fragmentShader: string, colorTokens: readonly string[]): RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const canvas = element
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const started = performance.now()
    let renderer: ShaderSurfaceRenderer | null = null
    let frame = 0
    let lastDraw = -Infinity
    let inView = true
    let lost = false

    function stop(): void { cancelAnimationFrame(frame); frame = 0 }
    function draw(now: number): void {
      frame = 0
      if (!renderer || lost || !inView || document.hidden) return
      // End the decorative intro after five seconds so it does not keep moving
      // alongside reading content. Reduced motion shows the initial frame.
      const elapsed = Math.min((now - started) / 1000, 5)
      if (now - lastDraw >= 1000 / 30 || elapsed === 5) {
        renderer.render(motion.matches ? 0 : elapsed)
        canvas.dataset.ready = 'true'
        lastDraw = now
      }
      if (!motion.matches && elapsed < 5) frame = requestAnimationFrame(draw)
    }
    function restart(): void {
      stop()
      lastDraw = -Infinity
      if (renderer && !lost && inView && !document.hidden) frame = requestAnimationFrame(draw)
    }
    function resize(): void {
      const bounds = canvas.getBoundingClientRect()
      renderer?.resize(Math.max(1, bounds.width), Math.max(1, bounds.height))
      restart()
    }
    function initialize(): void {
      try { renderer = createShaderSurfaceRenderer(canvas, fragmentShader, colorTokens) } catch { renderer = null }
      resize()
    }
    function contextLost(event: Event): void {
      event.preventDefault()
      lost = true
      stop()
      delete canvas.dataset.ready
      renderer?.dispose()
      renderer = null
    }
    function contextRestored(): void { lost = false; initialize() }
    function intersectionChanged(entries: IntersectionObserverEntry[]): void {
      inView = entries[0]?.isIntersecting ?? false
      restart()
    }
    const observer = new ResizeObserver(resize)
    const intersection = new IntersectionObserver(intersectionChanged)
    observer.observe(canvas)
    intersection.observe(canvas)
    motion.addEventListener('change', restart)
    document.addEventListener('visibilitychange', restart)
    canvas.addEventListener('webglcontextlost', contextLost)
    canvas.addEventListener('webglcontextrestored', contextRestored)
    initialize()
    return function cleanup(): void {
      stop()
      observer.disconnect()
      intersection.disconnect()
      motion.removeEventListener('change', restart)
      document.removeEventListener('visibilitychange', restart)
      canvas.removeEventListener('webglcontextlost', contextLost)
      canvas.removeEventListener('webglcontextrestored', contextRestored)
      renderer?.dispose()
      delete canvas.dataset.ready
    }
  }, [fragmentShader, colorTokens])
  return ref
}
