import { getSupabaseAdmin } from "../supabase-admin.js"

export async function requireWorkspaceMembership(userId: string, workspaceId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("workspace_users")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("You do not have access to this workspace")
}
