import type { RequestCategoryDefinition } from "@moc/types/requests";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchRequestCategories(workspaceId?: string): Promise<RequestCategoryDefinition[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.listCategories(resolvedWorkspaceId);
}
