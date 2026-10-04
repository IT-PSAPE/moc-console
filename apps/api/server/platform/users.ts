import { randomBytes } from "node:crypto"
import type { User } from "@moc/types/requests/assignee"
import type { MemberType } from "@moc/notifications"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, optionalUuidField, stringField, uuidField } from "./input.js"

type UserRow = {
  id: string; name: string; surname: string; email: string; telegram_chat_id: string | null
  avatar_url: string | null; current_duty: string | null; status_message: string | null
}
type RoleRow = { id: string; name: string; can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; can_manage_roles: boolean }
type UserWithRoleRow = UserRow & { role_id: string; role_name: string; can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; can_manage_roles: boolean; member_type_id: string; workspace_id: string }
type PendingRow = UserRow & { request_id: string; requested_at: string }
type MemberTypeRow = MemberType

const USER_FIELDS = "id, name, surname, email, telegram_chat_id, avatar_url, current_duty, status_message"
const ROLE_FIELDS = "id, name, can_create, can_read, can_update, can_delete, can_manage_roles"

function emptyInput(input: unknown): void {
  if (input === null || (typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0)) return
  objectInput(input, [])
}

function mapUser(row: UserRow): User {
  return { id: row.id, name: row.name, surname: row.surname, email: row.email, telegramChatId: row.telegram_chat_id, avatarUrl: row.avatar_url, currentDuty: row.current_duty, statusMessage: row.status_message }
}

function mapUserWithRole(row: UserWithRoleRow) {
  return {
    ...mapUser(row), workspaceIds: [row.workspace_id],
    role: { id: row.role_id, name: row.role_name, can_create: row.can_create, can_read: row.can_read, can_update: row.can_update, can_delete: row.can_delete, can_manage_roles: row.can_manage_roles },
    memberTypeId: row.member_type_id,
  }
}

function mapPending(row: PendingRow) {
  const { request_id, requested_at, ...user } = row
  return { ...mapUser(user), requestId: request_id, requestedAt: requested_at }
}

async function listWithRoles(context: PlatformContext) {
  const result = await context.db.query<UserWithRoleRow>(
    `SELECT u.${USER_FIELDS.split(", ").join(", u.")}, r.id AS role_id, r.name AS role_name,
       r.can_create, r.can_read, r.can_update, r.can_delete, r.can_manage_roles,
       m.member_type_id, m.workspace_id
     FROM public.workspace_users m JOIN public.users u ON u.id = m.user_id
     JOIN public.roles r ON r.id = m.role_id
     WHERE m.workspace_id = $1 ORDER BY lower(u.name), lower(u.surname), u.email`,
    [context.workspaceId],
  )
  return result.rows.map(mapUserWithRole)
}

function notFound(message: string): Error {
  const error = new Error(message) as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

export const operations: Record<string, PlatformOperation> = {
  getProfile: {
    permission: "authenticated",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<UserRow>(`SELECT ${USER_FIELDS} FROM public.users WHERE id = $1`, [context.userId])
      return result.rows[0] ? mapUser(result.rows[0]) : null
    },
  },
  all: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<UserRow>(
        `SELECT u.${USER_FIELDS.split(", ").join(", u.")} FROM public.workspace_users m
         JOIN public.users u ON u.id = m.user_id WHERE m.workspace_id = $1 ORDER BY lower(u.name), lower(u.surname), u.email`,
        [context.workspaceId],
      )
      return result.rows.map(mapUser)
    },
  },
  withRoles: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      return listWithRoles(context)
    },
  },
  pending: {
    permission: "can_manage_roles",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<PendingRow>(
        `SELECT j.id AS request_id, j.requested_at::text AS requested_at, u.${USER_FIELDS.split(", ").join(", u.")}
         FROM public.workspace_join_requests j JOIN public.users u ON u.id = j.user_id
         WHERE j.workspace_id = $1 ORDER BY j.requested_at`,
        [context.workspaceId],
      )
      return result.rows.map(mapPending)
    },
  },
  availableRoles: {
    permission: "authenticated",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<RoleRow>(`SELECT ${ROLE_FIELDS} FROM public.roles ORDER BY name`)
      return result.rows
    },
  },
  updateProfile: {
    permission: "authenticated",
    async run(context, input) {
      const record = objectInput(input, ["name", "surname", "avatarUrl", "currentDuty", "statusMessage"])
      const columns = ["name", "surname", "avatarUrl", "currentDuty", "statusMessage"] as const
      if (Object.keys(record).length === 0) throw new Error("No profile fields to update")
      const values: unknown[] = [context.userId]
      const setters: string[] = []
      const dbNames: Record<(typeof columns)[number], string> = { name: "name", surname: "surname", avatarUrl: "avatar_url", currentDuty: "current_duty", statusMessage: "status_message" }
      for (const column of columns) {
        if (record[column] === undefined) continue
        if (record[column] !== null && typeof record[column] !== "string") throw new Error(`Invalid ${column}`)
        values.push(record[column])
        setters.push(`${dbNames[column]} = $${values.length}`)
      }
      await context.db.query(`UPDATE public.users SET ${setters.join(", ")} WHERE id = $1`, values)
      return null
    },
  },
  assignRole: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["userId", "roleId"])
      await context.db.query("SELECT public.set_workspace_member_role($1, $2, $3)", [context.workspaceId, uuidField(record, "userId"), uuidField(record, "roleId")])
      return null
    },
  },
  approveJoinRequest: {
    permission: "can_manage_roles",
    async run(context, input) {
      const { requestId } = objectInput(input, ["requestId"])
      const id = uuidField({ requestId }, "requestId")
      const request = await context.db.query<{ user_id: string }>(
        "SELECT user_id FROM public.workspace_join_requests WHERE id = $1 AND workspace_id = $2",
        [id, context.workspaceId],
      )
      if (!request.rows[0]) throw notFound("Pending access request not found")
      await context.db.query("SELECT public.approve_workspace_join_request($1)", [id])
      return null
    },
  },
  rejectJoinRequest: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["requestId"])
      const id = uuidField(record, "requestId")
      const request = await context.db.query<{ user_id: string }>(
        "SELECT user_id FROM public.workspace_join_requests WHERE id = $1 AND workspace_id = $2",
        [id, context.workspaceId],
      )
      if (!request.rows[0]) throw notFound("Pending access request not found")
      await context.db.query("SELECT public.reject_workspace_join_request($1)", [id])
      return null
    },
  },
  createTelegramLinkToken: {
    permission: "authenticated",
    async run(context, input) {
      emptyInput(input)
      const token = randomBytes(32).toString("base64url")
      await context.db.query("DELETE FROM public.telegram_link_tokens WHERE user_id = $1", [context.userId])
      await context.db.query("INSERT INTO public.telegram_link_tokens (token, user_id) VALUES ($1, $2)", [token, context.userId])
      return { token }
    },
  },
  unlinkTelegram: {
    permission: "authenticated",
    async run(context, input) {
      emptyInput(input)
      await context.db.query("UPDATE public.users SET telegram_chat_id = NULL WHERE id = $1", [context.userId])
      return null
    },
  },
  requestAssignees: {
    permission: "can_read",
    async run(context, input) {
      const record = objectInput(input, ["requestId"])
      const result = await context.db.query<UserRow & { duty: string }>(
        `SELECT u.${USER_FIELDS.split(", ").join(", u.")}, a.duty FROM public.request_assignees a
         JOIN public.requests r ON r.id = a.request_id JOIN public.users u ON u.id = a.user_id
         WHERE a.request_id = $1 AND r.workspace_id = $2 ORDER BY a.duty`,
        [uuidField(record, "requestId"), context.workspaceId],
      )
      return result.rows.map((row) => ({ ...mapUser(row), duty: row.duty }))
    },
  },
  checklistAssignees: {
    permission: "can_read",
    async run(context, input) {
      const record = objectInput(input, ["checklistId"])
      const result = await context.db.query<UserRow & { checklist_item_id: string }>(
        `SELECT u.${USER_FIELDS.split(", ").join(", u.")}, a.checklist_item_id FROM public.checklist_item_assignees a
         JOIN public.checklist_items i ON i.id = a.checklist_item_id JOIN public.checklists c ON c.id = i.checklist_id
         JOIN public.users u ON u.id = a.user_id WHERE c.id = $1 AND c.workspace_id = $2 ORDER BY a.checklist_item_id, lower(u.name), lower(u.surname)`,
        [uuidField(record, "checklistId"), context.workspaceId],
      )
      const resultByItem = new Map<string, User[]>()
      for (const row of result.rows) resultByItem.set(row.checklist_item_id, [...(resultByItem.get(row.checklist_item_id) ?? []), mapUser(row)])
      return Object.fromEntries(resultByItem)
    },
  },
  memberTypes: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<MemberTypeRow>("SELECT id, name, is_default FROM public.workspace_member_types WHERE workspace_id = $1 ORDER BY name", [context.workspaceId])
      return result.rows
    },
  },
  saveMemberType: {
    permission: "can_update",
    async run(context, input) {
      const record = objectInput(input, ["name", "id"])
      const name = stringField(record, "name").trim()
      if (name.length < 1 || name.length > 80) throw new Error("Member type name must be 1 to 80 characters")
      const id = optionalUuidField(record, "id")
      if (id) {
        const result = await context.db.query("UPDATE public.workspace_member_types SET name = $3 WHERE workspace_id = $1 AND id = $2", [context.workspaceId, id, name])
        if (result.rowCount === 0) throw notFound("Member type not found")
      } else {
        await context.db.query("INSERT INTO public.workspace_member_types (workspace_id, name) VALUES ($1, $2)", [context.workspaceId, name])
      }
      return null
    },
  },
  assignMemberType: {
    permission: "can_update",
    async run(context, input) {
      const record = objectInput(input, ["userId", "typeId"])
      await context.db.query("SELECT public.set_workspace_member_type($1, $2, $3)", [context.workspaceId, uuidField(record, "userId"), uuidField(record, "typeId")])
      return null
    },
  },
}
