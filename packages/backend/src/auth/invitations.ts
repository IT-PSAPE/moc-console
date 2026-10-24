import { withActor } from "../database.js"
import type { QueryResultRow } from "pg"

type InvitationRow = QueryResultRow & { workspace_id: string; id: string }
type MembershipRow = QueryResultRow & { exists: boolean }
type InvitationUser = { id: string; email: string; name: string; surname?: string | null; image?: string | null }

export function normalizeInvitationEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Invalid email address")
  return normalized
}

export async function canSignInWithEmail(email: string): Promise<boolean> {
  const normalizedEmail = normalizeInvitationEmail(email)
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
    const result = await client.query<MembershipRow>(
      `SELECT EXISTS (
         SELECT 1 FROM public.users u JOIN public.workspace_users m ON m.user_id = u.id
         WHERE lower(btrim(u.email)) = $1
       ) OR EXISTS (
         SELECT 1 FROM public.workspace_invitations i
         WHERE i.normalized_email = $1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
       ) AS exists`,
      [normalizedEmail],
    )
    return result.rows[0]?.exists === true
  })
}

export async function hasWorkspaceMembership(userId: string): Promise<boolean> {
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
    const result = await client.query<MembershipRow>("SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = $1::uuid) AS exists", [userId])
    return result.rows[0]?.exists === true
  })
}

export async function acceptInvitations(user: InvitationUser): Promise<void> {
  const normalizedEmail = normalizeInvitationEmail(user.email)
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
    const invitations = await client.query<InvitationRow>(
      `SELECT workspace_id, id FROM public.workspace_invitations
       WHERE normalized_email = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       ORDER BY workspace_id, id FOR UPDATE`,
      [normalizedEmail],
    )
    const member = await client.query<MembershipRow>(
      "SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = $1::uuid) AS exists",
      [user.id],
    )
    if (invitations.rows.length === 0 && member.rows[0]?.exists !== true) throw new Error("No valid workspace invitation")
    if (invitations.rows.length === 0) return

    await client.query(
      `INSERT INTO public.users (id, name, surname, email, avatar_url)
       VALUES ($1::uuid, trim($2), trim($3), $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.name, user.surname?.trim() ?? "", user.email.trim(), user.image ?? null],
    )
    for (const invitation of invitations.rows) {
      const existingMembership = await client.query<MembershipRow>(
        "SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = $1::uuid AND user_id = $2::uuid) AS exists",
        [invitation.workspace_id, user.id],
      )
      await client.query(
        `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
         SELECT $1::uuid, $2::uuid, role.id, member_type.id
         FROM public.roles role
         CROSS JOIN LATERAL (
           SELECT id FROM public.workspace_member_types
           WHERE workspace_id = $1::uuid AND is_default
           ORDER BY id LIMIT 1
         ) member_type
         WHERE role.name = 'viewer'
         ON CONFLICT (workspace_id, user_id) DO NOTHING`,
        [invitation.workspace_id, user.id],
      )
      const membership = await client.query<MembershipRow>(
        "SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = $1::uuid AND user_id = $2::uuid) AS exists",
        [invitation.workspace_id, user.id],
      )
      if (existingMembership.rows[0]?.exists !== true && membership.rows[0]?.exists !== true) {
        throw new Error("Workspace membership could not be created")
      }
      const accepted = await client.query(
        `UPDATE public.workspace_invitations SET accepted_at = now()
         WHERE id = $1::uuid AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
        [invitation.id],
      )
      if (accepted.rowCount !== 1) throw new Error("Workspace invitation is no longer valid")
    }
    const finalMembership = await client.query<MembershipRow>(
      "SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = $1::uuid) AS exists",
      [user.id],
    )
    if (finalMembership.rows[0]?.exists !== true) throw new Error("Workspace membership could not be created")
  })
}
