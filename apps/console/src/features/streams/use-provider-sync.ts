import { getCurrentWorkspaceGeneration } from "@/data/current-workspace"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useCallback, useEffect, useRef, useState } from "react"

type ProviderSyncOptions<T> = {
  workspaceId: string | null
  enabled: boolean
  ready: boolean
  request: (workspaceId: string) => Promise<T>
  applyResult: (result: T) => void
  clearFailure: () => void
  describeFailure: (error: unknown, fallback: string) => string
  successTitle: string
  errorTitle: string
  errorMessage: string
}

/** Sync once on entry, without blocking the saved list or announcing success. */
export function useProviderSync<T>({ workspaceId, enabled, ready, request, applyResult, clearFailure, describeFailure, successTitle, errorTitle, errorMessage }: ProviderSyncOptions<T>) {
  const { toast } = useFeedback()
  const generation = getCurrentWorkspaceGeneration()
  const scope = `${workspaceId}:${generation}`
  const mounted = useRef(false)
  const attemptedScope = useRef<string | null>(null)
  const pending = useRef<{ scope: string; promise: Promise<void> } | null>(null)
  const [status, setStatus] = useState({ scope, isSyncing: false, error: null as string | null })

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const run = useCallback((background: boolean): Promise<void> => {
    if (!workspaceId || !enabled) return Promise.resolve()
    if (pending.current?.scope === scope) return pending.current.promise
    const targetWorkspaceId = workspaceId
    setStatus({ scope, isSyncing: true, error: null })

    function isCurrent() {
      return mounted.current && getCurrentWorkspaceGeneration() === generation
    }

    function requestResource() {
      return request(targetWorkspaceId)
    }

    async function performSync() {
      try {
        const result = await Promise.resolve().then(requestResource)
        if (!isCurrent()) return
        applyResult(result)
        clearFailure()
        if (!background) toast({ title: successTitle, variant: "success" })
      } catch (error) {
        if (!isCurrent()) return
        const message = describeFailure(error, errorMessage)
        setStatus({ scope, isSyncing: false, error: message })
        if (!background) toast({ title: errorTitle, description: message, variant: "error" })
      } finally {
        if (isCurrent()) setStatus(current => ({ ...current, isSyncing: false }))
        if (pending.current?.scope === scope) pending.current = null
      }
    }

    const promise = performSync()
    pending.current = { scope, promise }
    return promise
  }, [applyResult, clearFailure, describeFailure, enabled, errorMessage, errorTitle, generation, request, scope, successTitle, toast, workspaceId])

  useEffect(() => {
    if (!ready || !enabled || !workspaceId || attemptedScope.current === scope) return
    attemptedScope.current = scope
    void run(true)
  }, [enabled, ready, run, scope, workspaceId])

  const sync = useCallback(() => run(false), [run])

  return {
    state: { isSyncing: status.scope === scope && status.isSyncing, syncError: status.scope === scope ? status.error : null },
    actions: { sync },
  }
}
