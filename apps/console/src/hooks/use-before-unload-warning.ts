import { useEffect } from 'react'

export function useBeforeUnloadWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = true
    }

    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [enabled])
}
