import { useEffect, useState } from "react"
import { useRequests } from "./request-provider"

export function useRequestDetailLoader(id: string | undefined) {
  const { state, actions } = useRequests()
  const { loadRequest, syncRequest } = actions
  const [loadedId, setLoadedId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void loadRequest(id).finally(() => {
      if (!cancelled) setLoadedId(id)
    })
    return () => { cancelled = true }
  }, [id, loadRequest])

  return {
    state: { request: id ? state.requestsById[id] ?? null : null, isLoading: loadedId !== (id ?? null) },
    actions: { syncRequest },
  }
}
