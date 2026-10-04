import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"

export type WorkspacePermission = "can_create" | "can_read" | "can_update" | "can_delete" | "can_manage_roles"
export type WorkspaceWritePermission = WorkspacePermission | "can_write"
type RoleRow = Record<WorkspacePermission, boolean>
type WorkspacePermissionQuery = <Row extends QueryResultRow>(text: string, values: readonly unknown[]) => Promise<Row[]>

export async function requireWorkspacePermission(userId: string, workspaceId: string, permission: WorkspaceWritePermission, query: WorkspacePermissionQuery = queryRows): Promise<void> {
  const [role] = await query<RoleRow>(
    `SELECT r.can_create, r.can_read, r.can_update, r.can_delete, r.can_manage_roles
     FROM public.workspace_users m JOIN public.roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1::uuid AND m.user_id = $2::uuid`, [workspaceId, userId],
  )
  if (!role) throw new WorkspaceAccessError("Not a member of this workspace")
  // The operation transaction still applies distinct INSERT/UPDATE RLS policies.
  const allowed = permission === "can_write" ? role.can_create || role.can_update : role[permission]
  if (!allowed) throw new WorkspaceAccessError("Insufficient workspace permission")
}

export class WorkspaceAccessError extends Error {
  constructor(message: string) { super(message); this.name = "WorkspaceAccessError" }
}
