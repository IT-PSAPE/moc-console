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

  useEffect(() => {
    let cancelled = false

    fetchPublicRequestCategories()
      .then((categories) => {
        if (!cancelled) setState({ categories, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ categories: [], loading: false, error: error instanceof Error ? error.message : "Failed to load request categories" })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { state }
}
