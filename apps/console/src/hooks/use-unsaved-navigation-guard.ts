import { useEffect } from "react"
import { useBlocker } from "react-router-dom"

type UnsavedNavigationGuardOptions = {
  isDirty: boolean
  save: () => Promise<boolean>
  discard: () => void
}

export function useUnsavedNavigationGuard({ isDirty, save, discard }: UnsavedNavigationGuardOptions) {
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    if (!isDirty) return
    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", preventUnload)
    return () => window.removeEventListener("beforeunload", preventUnload)
  }, [isDirty])

  async function saveAndContinue() {
    if (await save() && blocker.state === "blocked") blocker.proceed()
  }

  function discardAndContinue() {
    discard()
    if (blocker.state === "blocked") blocker.proceed()
  }

  function cancel() {
    if (blocker.state === "blocked") blocker.reset()
  }

  return {
    state: { isBlocked: blocker.state === "blocked" },
    actions: { saveAndContinue, discardAndContinue, cancel },
  }
}
