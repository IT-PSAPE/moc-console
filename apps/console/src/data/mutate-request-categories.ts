import type { RequestCategoryDefinition } from "@moc/types/requests";
import type { RequestCategoryRename } from "@moc/sdk/requests";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export type RequestCategoryDraft = {
  name: string;
  description: string | null;
};

function createCategoryKey(): string {
  return `custom_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function createRequestCategory(draft: RequestCategoryDraft, workspaceId?: string): Promise<RequestCategoryDefinition> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.createCategory({ ...draft, key: createCategoryKey() }, resolvedWorkspaceId);
}

export async function updateRequestCategory(id: string, rename: RequestCategoryRename, workspaceId?: string): Promise<RequestCategoryDefinition> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.updateCategory(id, rename, resolvedWorkspaceId);
}

export async function setRequestCategoryActive(id: string, active: boolean, workspaceId?: string): Promise<void> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  await moc.requests.setCategoryActive(id, active, resolvedWorkspaceId);
}
