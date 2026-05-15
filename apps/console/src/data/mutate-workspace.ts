import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/workspace";

export type WorkspaceUpdate = {
  name?: string;
  slug?: string;
  description?: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export async function updateWorkspace(id: string, updates: WorkspaceUpdate): Promise<Workspace> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.description !== undefined) payload.description = updates.description;

  const { data, error } = await supabase
    .from("workspaces")
    .update(payload)
    .eq("id", id)
    .select("id, name, slug, description")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as WorkspaceRow;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
  };
}
