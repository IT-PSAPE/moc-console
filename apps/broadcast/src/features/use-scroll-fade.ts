import { useEffect, useRef, useState } from "react"

const FADE_TOLERANCE = 2

/**
 * Tracks whether a scroller has content out of view above and below, so an edge
 * fade is only drawn on the side that actually continues. At rest, nothing is
 * faded and the first and last rows stay fully legible.
 */
export function useScrollFade<Element extends HTMLElement>() {
  const ref = useRef<Element | null>(null)
  const [edges, setEdges] = useState({ hasBelow: false, hasAbove: false })

  useEffect(() => {
    const element = ref.current

    if (!element) {
      return
    }

    function sync() {
      const scroller = ref.current

      if (!scroller) return

      setEdges({
        hasAbove: scroller.scrollTop > FADE_TOLERANCE,
        hasBelow: scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - FADE_TOLERANCE,
      })
    }

    sync()
    element.addEventListener("scroll", sync, { passive: true })
    const observer = new ResizeObserver(sync)
    observer.observe(element)

    return () => {
      element.removeEventListener("scroll", sync)
      observer.disconnect()
    }
  }, [])

  return { edges, ref }
}
