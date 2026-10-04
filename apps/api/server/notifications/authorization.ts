import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { WorkspaceAccessError } from "../workspace-access.js"

/**
 * A creation notification may only be requested by the entity creator or a
 * member who can create in the workspace. Membership is always required so a
 * removed user cannot keep dispatching notifications for an old entity.
 */
export async function requireWorkspaceCreateOrEntityOwnership(
  userId: string,
  workspaceId: string,
  entityCreatedBy: string,
  lookupMembership: (userId: string, workspaceId: string) => Promise<{ can_create: boolean } | null> = findWorkspaceMembership,
): Promise<void> {
  const membership = await lookupMembership(userId, workspaceId)
  if (!membership) throw new WorkspaceAccessError("You do not have access to this workspace")
  if (entityCreatedBy !== userId && !membership.can_create) {
    throw new WorkspaceAccessError("Insufficient workspace permission")
  }
}

async function findWorkspaceMembership(userId: string, workspaceId: string): Promise<{ can_create: boolean } | null> {
  const memberships = await queryRows<QueryResultRow & { can_create: boolean }>(
    `SELECT role.can_create
     FROM public.workspace_users AS membership
     JOIN public.roles AS role ON role.id = membership.role_id
     WHERE membership.workspace_id = $1 AND membership.user_id = $2
     LIMIT 1`,
    [workspaceId, userId],
  )
  return memberships[0] ?? null
}
