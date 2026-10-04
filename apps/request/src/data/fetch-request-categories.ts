import { moc } from "@/lib/moc-client"
import { workspaceId } from "@/lib/workspace"
import type { RequestCategoryOption } from "@/types/tracking"

export async function fetchPublicRequestCategories(): Promise<RequestCategoryOption[]> {
  return moc.publicSubmissions.listRequestCategories(workspaceId)
}
