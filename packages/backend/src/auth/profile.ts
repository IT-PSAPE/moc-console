import { queryRows, withActor } from "../database.js"

type UserRecord = {
  id: string
  email: string
  name: string
  surname?: string
  workspaceSlug?: string | null
}

type WorkspaceRecord = { id: string }

export async function createProfileAndJoinRequest(user: UserRecord): Promise<void> {
  const workspaceSlug = user.workspaceSlug?.trim() || null
  const surname = user.surname?.trim() ?? ""
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
    const requested = workspaceSlug
      ? (await client.query<WorkspaceRecord>("SELECT id FROM public.workspaces WHERE slug = $1 LIMIT 1", [workspaceSlug])).rows[0]
      : undefined
    const workspace = requested ?? (await client.query<WorkspaceRecord>("SELECT id FROM public.workspaces WHERE slug = 'default-workspace' LIMIT 1")).rows[0]
    if (!workspace) throw new Error("No workspace available for this access request")

    await client.query(
      `INSERT INTO public.users (id, name, surname, email, telegram_chat_id)
       VALUES ($1::uuid, trim($2), trim($3), $4, NULL)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, surname = EXCLUDED.surname, email = EXCLUDED.email`,
      [user.id, user.name, surname, user.email],
    )
    await client.query(
      `INSERT INTO public.workspace_join_requests (workspace_id, user_id)
       VALUES ($1::uuid, $2::uuid) ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [workspace.id, user.id],
    )
  })
}

export async function syncProfileEmail(user: UserRecord): Promise<void> {
  await queryRows("UPDATE public.users SET email = $2 WHERE id = $1::uuid AND email IS DISTINCT FROM $2", [user.id, user.email])
}
