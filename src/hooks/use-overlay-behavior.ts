import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  })
}

interface UseOverlayBehaviorOptions {
  open: boolean
  onClose: () => void
}

export function useOverlayBehavior({ open, onClose }: UseOverlayBehaviorOptions) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(panelRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    requestAnimationFrame(() => {
      const nextTarget = closeButtonRef.current ?? getFocusableElements(panelRef.current)[0] ?? panelRef.current
      nextTarget?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElement?.focus()
    }
  }, [open, onClose])

  return { panelRef, closeButtonRef }
}
