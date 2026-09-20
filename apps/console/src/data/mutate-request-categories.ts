import type { RequestCategoryDefinition } from "@moc/types/requests";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { REQUEST_CATEGORY_SELECT, mapRequestCategoryRow, type RequestCategoryRow } from "./fetch-request-categories";

const FOREIGN_KEY_VIOLATION = "23503";

export type RequestCategoryDraft = {
  name: string;
  active: boolean;
};

function createCategoryKey(): string {
  return `custom_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function createRequestCategory(draft: RequestCategoryDraft, workspaceId?: string): Promise<RequestCategoryDefinition> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("request_categories")
    .insert({
      workspace_id: resolvedWorkspaceId,
      key: createCategoryKey(),
      name: draft.name,
      active: draft.active,
    })
    .select(REQUEST_CATEGORY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRequestCategoryRow(data as RequestCategoryRow);
}

export async function updateRequestCategory(id: string, draft: RequestCategoryDraft): Promise<RequestCategoryDefinition> {
  const { data, error } = await supabase
    .from("request_categories")
    .update({
      name: draft.name,
      active: draft.active,
    })
    .eq("id", id)
    .select(REQUEST_CATEGORY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRequestCategoryRow(data as RequestCategoryRow);
}

export async function setRequestCategoryActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("request_categories")
    .update({ active })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRequestCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("request_categories")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw new Error("This category has requests, so it can't be deleted. Deactivate it instead.");
    }
    throw new Error(error.message);
  }
}
