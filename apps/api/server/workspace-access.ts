import { getSupabaseAdmin } from "./supabase-admin.js"

export type WorkspacePermission = "can_create" | "can_read" | "can_update" | "can_delete" | "can_manage_roles"

type RoleRow = {
  roles: Record<WorkspacePermission, boolean> | Record<WorkspacePermission, boolean>[] | null
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function requireWorkspacePermission(
  userId: string,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { data: membership, error: membershipError } = await admin
    .from("workspace_users")
    .select("roles(can_create, can_read, can_update, can_delete, can_manage_roles)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) throw new WorkspaceAccessError("Not a member of this workspace")

  const role = first((membership as RoleRow | null)?.roles ?? null)
  if (!role?.[permission]) throw new WorkspaceAccessError("Insufficient workspace permission")
}

export class WorkspaceAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WorkspaceAccessError"
  }
}
