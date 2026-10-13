import { useEffect, useState } from "react"
import { fetchPublicRequestCategories } from "@/data/fetch-request-categories"
import type { RequestCategoryOption } from "@/types/tracking"

type RequestCategoriesState = {
  categories: RequestCategoryOption[]
  loading: boolean
  error: string | null
}

export function useRequestCategories() {
  const [state, setState] = useState<RequestCategoriesState>({ categories: [], loading: true, error: null })
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchPublicRequestCategories()
      .then((categories) => {
        if (!cancelled) setState({ categories, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "Failed to load request categories" }))
      })

    return () => {
      cancelled = true
    }
  }, [reloadVersion])

  function retry() {
    setState((current) => ({ ...current, loading: true, error: null }))
    setReloadVersion((current) => current + 1)
  }

  return { state, actions: { retry } }
}
