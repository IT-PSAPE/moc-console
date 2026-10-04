import type { RequestCategoryDefinition } from "@moc/types/requests";
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

export async function updateRequestCategory(id: string, draft: RequestCategoryDraft): Promise<RequestCategoryDefinition> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.updateCategory(id, draft, workspaceId);
}

export async function setRequestCategoryActive(id: string, active: boolean): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.requests.setCategoryActive(id, active, workspaceId);
}

export async function deleteRequestCategory(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  try {
    await moc.requests.deleteCategory(id, workspaceId);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "category_in_use") {
      throw new Error("This category has requests, so it can't be deleted. Deactivate it instead.");
    }
    throw error;
  }
}
