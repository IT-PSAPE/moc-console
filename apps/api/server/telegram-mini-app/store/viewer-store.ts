// Resolves the Telegram Mini App caller to a linked MOC user and their
// permissions in one workspace. Authorization is workspace-scoped via
// workspace_users.role_id (public.user_roles is kept only as a read-only
// legacy table post-2026-08-04 — see
// supabase/patches/2026-08-04-consolidated-live-schema-update.sql and
// .../2026-08-04-workspace-access-hardening.sql), mirroring
// private.current_user_can(workspace_id, permission) and matching the join
// api_apply_telegram_action uses.

import { getSupabaseAdmin } from "../../supabase-admin.js"

export type LinkedViewer = { userId: string; name: string }

export async function findViewerByTelegramId(telegramUserId: string): Promise<LinkedViewer | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, name, surname")
    .eq("telegram_chat_id", telegramUserId)
    .maybeSingle()
  if (error) throw new Error("Could not resolve the linked Telegram user")
  if (!data) return null
  return { userId: data.id as string, name: `${data.name as string} ${data.surname as string}`.trim() }
}

export type WorkspacePermissions = { canRead: boolean; canUpdate: boolean }

type MembershipRow = { roles: { can_read: boolean; can_update: boolean } | null }

export async function loadWorkspacePermissions(workspaceId: string, userId: string): Promise<WorkspacePermissions | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspace_users")
    .select("roles ( can_read, can_update )")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error("Could not resolve the user's workspace role")

  const roleRow = (data as unknown as MembershipRow | null)?.roles ?? null
  if (!roleRow) return null
  return { canRead: Boolean(roleRow.can_read), canUpdate: Boolean(roleRow.can_update) }
}
