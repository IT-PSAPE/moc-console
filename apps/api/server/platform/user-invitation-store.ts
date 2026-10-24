import { normalizeInvitationEmail } from "@moc/backend/auth/invitations"
import { withActor } from "@moc/backend/database"
import type { PoolClient } from "pg"
import type { PlatformContext } from "./context.js"
import { PlatformInputError } from "./input.js"

export type InvitationRow = { id: string; email: string; created_at: string; expires_at: string }

function invitationEmailAddress(email: string): string {
  try {
    return normalizeInvitationEmail(email)
  } catch {
    throw new PlatformInputError("Invalid email address")
  }
}

function notFound(): Error {
  const error = new Error("Workspace invitation not found") as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

function alreadyMember(): Error {
  const error = new Error("This email already belongs to a workspace member") as Error & { status: number; code: string }
  error.status = 409
  error.code = "already_a_member"
  return error
}

async function withWorkspaceManager<T>(context: PlatformContext, work: (client: PoolClient) => Promise<T>): Promise<T> {
  return withActor({ userId: context.userId, workspaceId: context.workspaceId, role: "moc_worker" }, async (client) => {
    const manager = await client.query<{ can_manage_roles: boolean }>(
      `SELECT r.can_manage_roles FROM public.workspace_users m JOIN public.roles r ON r.id = m.role_id
       WHERE m.workspace_id = $1::uuid AND m.user_id = $2::uuid`,
      [context.workspaceId, context.userId],
    )
    if (manager.rows[0]?.can_manage_roles !== true) {
      const error = new Error("Insufficient workspace permission") as Error & { status: number; code: string }
      error.status = 403
      error.code = "forbidden"
      throw error
    }
    return work(client)
  })
}

async function ensureNotMember(client: PoolClient, workspaceId: string, normalizedEmail: string): Promise<void> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM public.users u JOIN public.workspace_users m ON m.user_id = u.id
       WHERE m.workspace_id = $1::uuid AND lower(btrim(u.email)) = $2
     ) AS exists`,
    [workspaceId, normalizedEmail],
  )
  if (result.rows[0]?.exists) throw alreadyMember()
}

export async function listInvitations(context: PlatformContext): Promise<InvitationRow[]> {
  const result = await context.db.query<InvitationRow>(
    `SELECT id, email, created_at::text, expires_at::text
     FROM public.workspace_invitations WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL
     ORDER BY created_at DESC, id`,
    [context.workspaceId],
  )
  return result.rows
}

export async function inviteWorkspaceEmail(context: PlatformContext, inputEmail: string): Promise<InvitationRow> {
  const email = inputEmail.trim()
  const normalizedEmail = invitationEmailAddress(email)
  const invitation = await withWorkspaceManager(context, async (client) => {
    await ensureNotMember(client, context.workspaceId, normalizedEmail)
    const result = await client.query<InvitationRow>(
      `INSERT INTO public.workspace_invitations (workspace_id, email, expires_at)
       VALUES ($1, $2, now() + interval '7 days')
       ON CONFLICT (workspace_id, normalized_email) WHERE accepted_at IS NULL AND revoked_at IS NULL
       DO UPDATE SET email = EXCLUDED.email, expires_at = EXCLUDED.expires_at
       RETURNING id, email, created_at::text, expires_at::text`,
      [context.workspaceId, email],
    )
    return result.rows[0]
  })
  if (!invitation) throw new Error("Invitation could not be saved")
  return invitation
}

export async function resendWorkspaceInvitation(context: PlatformContext, invitationId: string): Promise<InvitationRow> {
  const invitation = await withWorkspaceManager(context, async (client) => {
    const result = await client.query<InvitationRow>(
      `UPDATE public.workspace_invitations SET expires_at = now() + interval '7 days'
       WHERE id = $1::uuid AND workspace_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL
       RETURNING id, email, created_at::text, expires_at::text`,
      [invitationId, context.workspaceId],
    )
    return result.rows[0]
  })
  if (!invitation) throw notFound()
  return invitation
}

export async function revokeWorkspaceInvitation(context: PlatformContext, invitationId: string): Promise<void> {
  const revoked = await withWorkspaceManager(context, async (client) => {
    const result = await client.query(
      `UPDATE public.workspace_invitations SET revoked_at = now()
       WHERE id = $1::uuid AND workspace_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [invitationId, context.workspaceId],
    )
    return result.rowCount !== 0
  })
  if (!revoked) throw notFound()
}
