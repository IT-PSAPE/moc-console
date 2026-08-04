import { getSupabaseAdmin } from "./supabase-admin.js"

export type WorkspacePermission = "can_create" | "can_read" | "can_update" | "can_delete" | "can_manage_roles"

export function permissionForMethod(method: string | undefined): WorkspacePermission {
  switch (method?.toUpperCase()) {
    case "GET":
    case "HEAD":
      return "can_read"
    case "POST":
      return "can_create"
    case "PUT":
    case "PATCH":
      return "can_update"
    case "DELETE":
      return "can_delete"
    default:
      throw new WorkspaceAccessError("Unsupported provider request method")
  }
}

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
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) throw new WorkspaceAccessError("Not a member of this workspace")

  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("roles(can_create, can_read, can_update, can_delete, can_manage_roles)")
    .eq("user_id", userId)
    .maybeSingle()

  if (roleError) throw new Error(roleError.message)
  const role = first((roleRow as RoleRow | null)?.roles ?? null)
  if (!role?.[permission]) throw new WorkspaceAccessError("Insufficient workspace permission")
}

export class WorkspaceAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WorkspaceAccessError"
  }
}
