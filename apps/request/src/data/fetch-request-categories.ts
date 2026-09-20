import { supabase } from "@moc/data/supabase"
import { workspaceId } from "@/lib/workspace"
import type { RequestCategoryOption } from "@/types/tracking"

type PublicRequestCategoryRow = {
  key: string
  name: string
}

export async function fetchPublicRequestCategories(): Promise<RequestCategoryOption[]> {
  const { data, error } = await supabase.rpc("public_list_request_categories", {
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)

  return ((data ?? []) as PublicRequestCategoryRow[]).map((category) => ({
    value: category.key,
    label: category.name,
  }))
}
