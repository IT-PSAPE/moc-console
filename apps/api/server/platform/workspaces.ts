import type { Workspace, WorkspaceMembership } from "@moc/types/workspace"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, optionalStringField } from "./input.js"

type WorkspaceRow = { id: string; name: string; slug: string; description: string | null }
type RoleRow = { id: string; name: string; can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; can_manage_roles: boolean }

function emptyInput(input: unknown): void {
  if (input === null || (typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0)) return
  objectInput(input, [])
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description }
}

async function directory(context: PlatformContext): Promise<{ workspaces: Workspace[]; memberships: WorkspaceMembership[] }> {
  const result = await context.db.query<WorkspaceRow & { workspace_id: string; user_id: string; role_id: string; role_name: string; can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; can_manage_roles: boolean }>(
    `SELECT w.id, w.name, w.slug, w.description, m.workspace_id, m.user_id,
       r.id AS role_id, r.name AS role_name, r.can_create, r.can_read, r.can_update, r.can_delete, r.can_manage_roles
     FROM public.workspace_users m
     JOIN public.workspaces w ON w.id = m.workspace_id
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.user_id = $1
     ORDER BY w.name`,
    [context.userId],
  )
  const workspaces = new Map<string, Workspace>()
  const memberships: WorkspaceMembership[] = []
  for (const row of result.rows) {
    workspaces.set(row.id, mapWorkspace(row))
    const role: RoleRow = {
      id: row.role_id, name: row.role_name, can_create: row.can_create, can_read: row.can_read,
      can_update: row.can_update, can_delete: row.can_delete, can_manage_roles: row.can_manage_roles,
    }
    memberships.push({ workspaceId: row.workspace_id, userId: row.user_id, role })
  }
  return { workspaces: [...workspaces.values()], memberships }
}

export const operations: Record<string, PlatformOperation> = {
  directory: {
    permission: "authenticated",
    async run(context, input) {
      emptyInput(input)
      return directory(context)
    },
  },
  signupWorkspaces: {
    permission: "public",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<Pick<WorkspaceRow, "id" | "name" | "slug">>(
        "SELECT id, name, slug FROM public.list_signup_workspaces()",
      )
      return result.rows.map((row) => ({ ...row, description: null }))
    },
  },
  update: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["name", "slug", "description"])
      const name = optionalStringField(record, "name")
      const slug = optionalStringField(record, "slug")
      const description = record.description === undefined ? undefined : record.description
      if (description !== undefined && description !== null && typeof description !== "string") throw new Error("Invalid description")
      if (name === undefined && slug === undefined && description === undefined) throw new Error("No workspace fields to update")
      const result = await context.db.query<WorkspaceRow>(
        `UPDATE public.workspaces SET name = COALESCE($2, name), slug = COALESCE($3, slug),
         description = CASE WHEN $4::boolean THEN $5::text ELSE description END
         WHERE id = $1 RETURNING id, name, slug, description`,
        [context.workspaceId, name ?? null, slug ?? null, description !== undefined, description ?? null],
      )
      if (!result.rows[0]) throw new Error("Workspace not found")
      return mapWorkspace(result.rows[0])
    },
  },
}
