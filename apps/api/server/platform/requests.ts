import type { Request, RequestActivity, RequestCategoryDefinition, RequestComment, RequestHistoryActor, Status } from "@moc/types/requests"
import { getCategoryLabel } from "@moc/types/requests"
import type { PlatformOperation } from "./context.js"
import { objectInput, optionalStringField, PlatformInputError, stringField, uuidField } from "./input.js"

type DbTimestamp = string | Date

function isoTimestamp(value: DbTimestamp): string {
  return value instanceof Date ? value.toISOString() : value
}

type RequestRow = {
  id: string; title: string; priority: Request["priority"]; status: Status; category: string
  created_at: DbTimestamp; updated_at: DbTimestamp; due_date: DbTimestamp; requested_by: string
  who: string; what: string; when_text: string; where_text: string; why: string; how: string
  notes: string | null; flow: string | null; content: string | null; category_name: string | null
}

type CategoryRow = {
  id: string; workspace_id: string; key: string; name: string; description: string | null
  active: boolean; sort_order: number; created_at: DbTimestamp; updated_at: DbTimestamp
}

type HistoryRow = {
  id: string; request_id: string; event_type: RequestActivity["type"]; details: Record<string, unknown> | null
  body?: string; created_at: DbTimestamp; actor_id: string | null; actor_name: string | null
  actor_surname: string | null; actor_avatar_url: string | null
}

const REQUEST_FIELDS = `requests.id, requests.title, requests.priority, requests.status, requests.category,
  requests.created_at, requests.updated_at, requests.due_date, requests.requested_by, requests.who,
  requests.what, requests.when_text, requests.where_text, requests.why, requests.how, requests.notes,
  requests.flow, requests.content, request_categories.name AS category_name`

function mapRequest(row: RequestRow): Request {
  return {
    id: row.id, title: row.title, priority: row.priority, status: row.status, category: row.category,
    categoryName: getCategoryLabel(row.category, row.category_name ?? undefined), createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at), dueDate: isoTimestamp(row.due_date), requestedBy: row.requested_by, who: row.who,
    what: row.what, when: row.when_text, where: row.where_text, why: row.why, how: row.how,
    notes: row.notes ?? undefined, flow: row.flow ?? undefined, content: row.content ?? undefined,
  }
}

function mapCategory(row: CategoryRow): RequestCategoryDefinition {
  return { id: row.id, workspaceId: row.workspace_id, key: row.key, name: row.name,
    description: row.description, active: row.active, sortOrder: row.sort_order,
    createdAt: isoTimestamp(row.created_at), updatedAt: isoTimestamp(row.updated_at) }
}

function mapActor(row: HistoryRow): RequestHistoryActor | null {
  if (!row.actor_id) return null
  return { id: row.actor_id, name: row.actor_name ?? "", surname: row.actor_surname ?? "", avatarUrl: row.actor_avatar_url }
}

function mapActivity(row: HistoryRow): RequestActivity {
  return { id: row.id, requestId: row.request_id, type: row.event_type, details: row.details ?? {},
    actor: mapActor(row), createdAt: isoTimestamp(row.created_at) }
}

function mapComment(row: HistoryRow): RequestComment {
  return { id: row.id, requestId: row.request_id, body: row.body ?? "", actor: mapActor(row), createdAt: isoTimestamp(row.created_at) }
}

function requestInput(value: unknown): Request {
  const input = objectInput(value, ["id", "title", "priority", "status", "category", "categoryName", "createdAt", "updatedAt", "dueDate", "requestedBy", "who", "what", "when", "where", "why", "how", "notes", "flow", "content"])
  const priority = stringField(input, "priority")
  const status = stringField(input, "status")
  if (!["low", "medium", "high"].includes(priority)) throw new PlatformInputError("Invalid priority")
  if (!["not_started", "in_progress", "completed", "archived"].includes(status)) throw new PlatformInputError("Invalid status")
  return {
    id: uuidField(input, "id"), title: stringField(input, "title"), priority: priority as Request["priority"],
    status: status as Status, category: stringField(input, "category"), createdAt: stringField(input, "createdAt"),
    updatedAt: stringField(input, "updatedAt"), dueDate: stringField(input, "dueDate"), requestedBy: stringField(input, "requestedBy"),
    who: stringField(input, "who"), what: stringField(input, "what"), when: stringField(input, "when"),
    where: stringField(input, "where"), why: stringField(input, "why"), how: stringField(input, "how"),
    notes: optionalStringField(input, "notes"), flow: optionalStringField(input, "flow"), content: optionalStringField(input, "content"),
  }
}

function historySelect(kind: "activity" | "comment"): string {
  const detailColumns = kind === "activity" ? "history.event_type, history.details," : "NULL::text AS event_type, NULL::jsonb AS details, history.body,"
  const table = kind === "activity" ? "request_activity" : "request_comments"
  return `SELECT history.id, history.request_id, ${detailColumns} history.created_at, history.actor_id,
    users.name AS actor_name, users.surname AS actor_surname, users.avatar_url AS actor_avatar_url
    FROM ${table} AS history LEFT JOIN users ON users.id = history.actor_id
    JOIN requests ON requests.id = history.request_id
    WHERE requests.workspace_id = $1 AND history.request_id = $2
    ORDER BY history.created_at DESC`
}

export const operations: Record<string, PlatformOperation> = {
  list: { permission: "can_read", run: async ({ db, workspaceId }) => {
    const result = await db.query<RequestRow>(`SELECT ${REQUEST_FIELDS} FROM requests
      LEFT JOIN request_categories ON request_categories.workspace_id = requests.workspace_id AND request_categories.key = requests.category
      WHERE requests.workspace_id = $1 AND requests.status <> 'archived' ORDER BY requests.due_date ASC`, [workspaceId])
    return result.rows.map(mapRequest)
  } },
  listByStatus: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["status"])
    const status = stringField(input, "status")
    if (!["not_started", "in_progress", "completed", "archived"].includes(status)) throw new PlatformInputError("Invalid status")
    const result = await db.query<RequestRow>(`SELECT ${REQUEST_FIELDS} FROM requests
      LEFT JOIN request_categories ON request_categories.workspace_id = requests.workspace_id AND request_categories.key = requests.category
      WHERE requests.workspace_id = $1 AND requests.status = $2 ORDER BY requests.due_date ASC`, [workspaceId, status])
    return result.rows.map(mapRequest)
  } },
  getById: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id", "workspaceId"])
    const id = uuidField(input, "id")
    const result = await db.query<RequestRow>(`SELECT ${REQUEST_FIELDS} FROM requests
      LEFT JOIN request_categories ON request_categories.workspace_id = requests.workspace_id AND request_categories.key = requests.category
      WHERE requests.workspace_id = $1 AND requests.id = $2 LIMIT 1`, [workspaceId, id])
    return result.rows[0] ? mapRequest(result.rows[0]) : undefined
  } },
  listArchived: { permission: "can_read", run: async ({ db, workspaceId }) => {
    const result = await db.query<RequestRow>(`SELECT ${REQUEST_FIELDS} FROM requests
      LEFT JOIN request_categories ON request_categories.workspace_id = requests.workspace_id AND request_categories.key = requests.category
      WHERE requests.workspace_id = $1 AND requests.status = 'archived' ORDER BY requests.updated_at DESC`, [workspaceId])
    return result.rows.map(mapRequest)
  } },
  save: { permission: "can_write", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["request"])
    const request = requestInput(input.request)
    const result = await db.query<RequestRow>(`WITH saved AS (INSERT INTO requests
      (id, workspace_id, title, priority, status, category, created_at, updated_at, due_date, requested_by,
       who, what, when_text, where_text, why, how, notes, flow, content)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, priority=EXCLUDED.priority, status=EXCLUDED.status,
       category=EXCLUDED.category, updated_at=now(), due_date=EXCLUDED.due_date, requested_by=EXCLUDED.requested_by,
       who=EXCLUDED.who, what=EXCLUDED.what, when_text=EXCLUDED.when_text, where_text=EXCLUDED.where_text,
       why=EXCLUDED.why, how=EXCLUDED.how, notes=EXCLUDED.notes, flow=EXCLUDED.flow, content=EXCLUDED.content,
       created_at=EXCLUDED.created_at WHERE requests.workspace_id=$2
      RETURNING *) SELECT ${REQUEST_FIELDS} FROM saved AS requests
      LEFT JOIN request_categories ON request_categories.workspace_id=requests.workspace_id AND request_categories.key=requests.category`, [request.id, workspaceId, request.title, request.priority, request.status,
        request.category, request.createdAt, request.updatedAt, request.dueDate, request.requestedBy, request.who,
        request.what, request.when, request.where, request.why, request.how, request.notes ?? null, request.flow ?? null, request.content ?? null])
    if (!result.rows[0]) throw new Error("Request could not be saved")
    return mapRequest(result.rows[0])
  } },
  setStatus: { permission: "can_update", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id", "status"])
    const id = uuidField(input, "id")
    const status = stringField(input, "status")
    if (!["not_started", "in_progress", "completed", "archived"].includes(status)) throw new PlatformInputError("Invalid status")
    await db.query("UPDATE requests SET status=$3, updated_at=now() WHERE workspace_id=$1 AND id=$2", [workspaceId, id, status])
    return null
  } },
  delete: { permission: "can_delete", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id"])
    await db.query("DELETE FROM requests WHERE workspace_id=$1 AND id=$2", [workspaceId, uuidField(input, "id")])
    return null
  } },
  addAssignee: { permission: "can_write", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["requestId", "userId", "duty"])
    const requestId = uuidField(input, "requestId")
    const userId = uuidField(input, "userId")
    const duty = stringField(input, "duty")
    const existing = await db.query<{ id: string; duty: string }>(`SELECT assignment.id, assignment.duty FROM request_assignees AS assignment
      JOIN requests ON requests.id=assignment.request_id
      JOIN workspace_users AS member ON member.workspace_id=requests.workspace_id AND member.user_id=assignment.user_id
      WHERE requests.workspace_id=$1 AND assignment.request_id=$2 AND assignment.user_id=$3 LIMIT 1 FOR UPDATE OF assignment`,
      [workspaceId, requestId, userId])
    if (existing.rows[0]) {
      if (existing.rows[0].duty === duty) return false
      await db.query("UPDATE request_assignees SET duty=$2 WHERE id=$1", [existing.rows[0].id, duty])
      return true
    }
    const inserted = await db.query<{ id: string }>(`INSERT INTO request_assignees (request_id,user_id,duty)
      SELECT requests.id,$3,$4 FROM requests WHERE requests.id=$2 AND requests.workspace_id=$1 AND EXISTS (
        SELECT 1 FROM workspace_users AS member WHERE member.workspace_id=$1 AND member.user_id=$3)
      ON CONFLICT (request_id,user_id,duty) DO NOTHING RETURNING id`, [workspaceId, requestId, userId, duty])
    return inserted.rows.length > 0
  } },
  removeAssignee: { permission: "can_delete", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["requestId", "userId"])
    await db.query(`DELETE FROM request_assignees AS assignment USING requests
      WHERE assignment.request_id=requests.id AND requests.workspace_id=$1 AND assignment.request_id=$2 AND assignment.user_id=$3`, [workspaceId, uuidField(input, "requestId"), uuidField(input, "userId")])
    return null
  } },
  listCategories: { permission: "can_read", run: async ({ db, workspaceId }) => {
    const result = await db.query<CategoryRow>(`SELECT id, workspace_id, key, name, description, active, sort_order, created_at, updated_at
      FROM request_categories WHERE workspace_id=$1 ORDER BY sort_order ASC, name ASC`, [workspaceId])
    return result.rows.map(mapCategory)
  } },
  createCategory: { permission: "can_create", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["key", "name", "description", "workspaceId"])
    const result = await db.query<CategoryRow>(`INSERT INTO request_categories (workspace_id,key,name,description)
      VALUES ($1,$2,$3,$4) RETURNING id,workspace_id,key,name,description,active,sort_order,created_at,updated_at`,
      [workspaceId, stringField(input, "key"), stringField(input, "name"), optionalStringField(input, "description") ?? null])
    return mapCategory(result.rows[0])
  } },
  updateCategory: { permission: "can_update", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id", "name", "description"])
    const result = await db.query<CategoryRow>(`UPDATE request_categories SET name=$3, description=$4
      WHERE workspace_id=$1 AND id=$2 RETURNING id,workspace_id,key,name,description,active,sort_order,created_at,updated_at`,
      [workspaceId, uuidField(input, "id"), stringField(input, "name"), optionalStringField(input, "description") ?? null])
    if (!result.rows[0]) throw new Error("Request category not found")
    return mapCategory(result.rows[0])
  } },
  setCategoryActive: { permission: "can_update", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id", "active"])
    if (typeof input.active !== "boolean") throw new PlatformInputError("Invalid active")
    await db.query("UPDATE request_categories SET active=$3 WHERE workspace_id=$1 AND id=$2", [workspaceId, uuidField(input, "id"), input.active])
    return null
  } },
  deleteCategory: { permission: "can_delete", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["id"])
    try {
      await db.query("DELETE FROM request_categories WHERE workspace_id=$1 AND id=$2", [workspaceId, uuidField(input, "id")])
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
        const conflict = new Error("This category has requests, so it can't be deleted. Deactivate it instead.")
        Object.assign(conflict, { code: "category_in_use", status: 409 })
        throw conflict
      }
      throw error
    }
    return null
  } },
  listActivity: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["requestId"])
    const result = await db.query<HistoryRow>(historySelect("activity"), [workspaceId, uuidField(input, "requestId")])
    return result.rows.map(mapActivity)
  } },
  listComments: { permission: "can_read", run: async ({ db, workspaceId }, value) => {
    const input = objectInput(value, ["requestId"])
    const result = await db.query<HistoryRow>(historySelect("comment"), [workspaceId, uuidField(input, "requestId")])
    return result.rows.map(mapComment)
  } },
  createComment: { permission: "can_update", run: async ({ db, userId, workspaceId }, value) => {
    const input = objectInput(value, ["requestId", "body"])
    const requestId = uuidField(input, "requestId")
    const body = stringField(input, "body").trim()
    if (!body) throw new PlatformInputError("Comment cannot be empty")
    const result = await db.query<HistoryRow>(`WITH inserted AS (
      INSERT INTO request_comments (request_id,actor_id,body)
      SELECT requests.id,$3,$4 FROM requests WHERE requests.id=$2 AND requests.workspace_id=$1
      RETURNING id, request_id, body, created_at, actor_id
      ) SELECT inserted.id, inserted.request_id, NULL::text AS event_type, NULL::jsonb AS details, inserted.body, inserted.created_at,
        inserted.actor_id, users.name AS actor_name, users.surname AS actor_surname, users.avatar_url AS actor_avatar_url
        FROM inserted LEFT JOIN users ON users.id=inserted.actor_id`, [workspaceId, requestId, userId, body])
    if (!result.rows[0]) throw new Error("Request not found")
    return mapComment(result.rows[0])
  } },
}
