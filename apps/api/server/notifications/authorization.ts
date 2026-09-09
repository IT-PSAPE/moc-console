import { getSupabaseAdmin } from "../supabase-admin.js"
import { WorkspaceAccessError } from "../workspace-access.js"

type WorkspaceRole = { can_create: boolean }

type WorkspaceMembership = {
  roles: WorkspaceRole | WorkspaceRole[] | null
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

/**
 * A creation notification may only be requested by the entity creator or a
 * member who can create in the workspace. Membership is always required so a
 * removed user cannot keep dispatching notifications for an old entity.
 */
export async function requireWorkspaceCreateOrEntityOwnership(
  userId: string,
  workspaceId: string,
  entityCreatedBy: string,
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("workspace_users")
    .select("roles(can_create)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new WorkspaceAccessError("You do not have access to this workspace")

  const membership = data as WorkspaceMembership
  const role = first(membership.roles)
  if (entityCreatedBy !== userId && !role?.can_create) {
    throw new WorkspaceAccessError("Insufficient workspace permission")
  }
}
