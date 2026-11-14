import { useCallback, useEffect, useRef } from "react"

type TaskLifetimeActions = {
  start: (signal?: AbortSignal) => AbortController
  finish: (controller: AbortController) => void
}

/** Cancels owned asynchronous work on unmount or when its account/workspace scope changes. */
export function useTaskLifetime(scope: string): TaskLifetimeActions {
  const lifetimeRef = useRef({ scope, active: true, controllers: new Map<AbortController, () => void>() })

  useEffect(() => {
    const lifetime = { scope, active: true, controllers: new Map<AbortController, () => void>() }
    lifetimeRef.current = lifetime
    return () => {
      lifetime.active = false
      for (const [controller, dispose] of lifetime.controllers) { controller.abort(); dispose() }
      lifetime.controllers.clear()
    }
  }, [scope])

  const start = useCallback((signal?: AbortSignal): AbortController => {
    const controller = new AbortController()
    const lifetime = lifetimeRef.current
    function abort(): void { controller.abort(signal?.reason) }
    function dispose(): void { signal?.removeEventListener("abort", abort) }
    if (!lifetime.active || lifetime.scope !== scope || signal?.aborted) controller.abort(signal?.reason)
    else {
      signal?.addEventListener("abort", abort, { once: true })
      lifetime.controllers.set(controller, dispose)
    }
    return controller
  }, [scope])

  const finish = useCallback((controller: AbortController): void => {
    lifetimeRef.current.controllers.get(controller)?.()
    lifetimeRef.current.controllers.delete(controller)
  }, [])

  return { start, finish }
}
