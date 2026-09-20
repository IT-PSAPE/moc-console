import type { RequestCategoryDefinition } from "@moc/types/requests";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

export const REQUEST_CATEGORY_SELECT = "id, workspace_id, key, name, active, sort_order, created_at, updated_at";

export type RequestCategoryRow = {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function mapRequestCategoryRow(row: RequestCategoryRow): RequestCategoryDefinition {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    key: row.key,
    name: row.name,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRequestCategories(workspaceId?: string): Promise<RequestCategoryDefinition[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("request_categories")
    .select(REQUEST_CATEGORY_SELECT)
    .eq("workspace_id", resolvedWorkspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestCategoryRow[]).map(mapRequestCategoryRow);
}
