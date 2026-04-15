import { supabase } from "@/lib/supabase";
import type { Workspace, WorkspaceMembership } from "@/types/workspace";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceMembershipRow = {
  workspace_id: string;
  user_id: string;
};

export type WorkspaceDirectory = {
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
};

const fallbackWorkspace: Workspace = {
  id: "default-workspace",
  name: "Default Workspace",
  slug: "default-workspace",
};

function getFallbackDirectory(userIds: string[]): WorkspaceDirectory {
  return {
    workspaces: [fallbackWorkspace],
    memberships: userIds.map((userId) => ({
      workspaceId: fallbackWorkspace.id,
      userId,
    })),
  };
}

export async function fetchWorkspaceDirectory(userIds: string[]): Promise<WorkspaceDirectory> {
  if (userIds.length === 0) {
    return { workspaces: [], memberships: [] };
  }

  const [{ data: workspaceData, error: workspaceError }, { data: membershipData, error: membershipError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug").order("name"),
    supabase.from("workspace_users").select("workspace_id, user_id").in("user_id", userIds),
  ]);

  if (workspaceError || membershipError || !(workspaceData && workspaceData.length > 0)) {
    return getFallbackDirectory(userIds);
  }

  return {
    workspaces: (workspaceData as WorkspaceRow[]).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    })),
    memberships: ((membershipData ?? []) as WorkspaceMembershipRow[]).map((membership) => ({
      workspaceId: membership.workspace_id,
      userId: membership.user_id,
    })),
  };
}
