import { useQuery } from "@tanstack/react-query"
import { fetchPublicRequestCategories } from "@/data/fetch-request-categories"
import { workspaceId } from "@/lib/workspace"

export const requestCategoriesQueryKey = ["public", workspaceId, "request-categories"] as const

export function useRequestCategories() {
  const query = useQuery({
    queryKey: requestCategoriesQueryKey,
    queryFn: fetchPublicRequestCategories,
    staleTime: 5 * 60_000,
  })
  const categories = query.data ?? []
  const categoryAvailability = {
    unavailable: query.isPending || categories.length === 0,
    placeholder: query.isPending ? "Loading categories…"
      : query.isError && query.data === undefined ? "Categories unavailable"
        : categories.length === 0 ? "No categories available" : "Select a category",
  }

  return {
    state: { categories, loading: query.isPending, error: query.data === undefined && query.error instanceof Error ? query.error.message : null, categoryAvailability },
    actions: { retry: () => query.refetch() },
  }
}
