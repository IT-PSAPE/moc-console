import { supabase } from "@moc/data/supabase";
import type { Workspace, WorkspaceMembership } from "@moc/types/workspace";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type WorkspaceMembershipRow = {
  workspace_id: string;
  user_id: string;
};

export type WorkspaceDirectory = {
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
};

type SignupWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
};

export async function fetchSignupWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase.rpc("list_signup_workspaces");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SignupWorkspaceRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: null,
  }));
}

export async function fetchWorkspaceDirectory(userIds: string[]): Promise<WorkspaceDirectory> {
  if (userIds.length === 0) {
    return { workspaces: [], memberships: [] };
  }

  const [{ data: workspaceData, error: workspaceError }, { data: membershipData, error: membershipError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug, description").order("name"),
    supabase.from("workspace_users").select("workspace_id, user_id").in("user_id", userIds),
  ]);

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  return {
    workspaces: (workspaceData as WorkspaceRow[]).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description ?? null,
    })),
    memberships: ((membershipData ?? []) as WorkspaceMembershipRow[]).map((membership) => ({
      workspaceId: membership.workspace_id,
      userId: membership.user_id,
    })),
  };
}
