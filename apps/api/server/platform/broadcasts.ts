import type { Broadcast, BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { makeUploadUrl } from "@moc/backend/storage/upload-protocol"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, optionalStringField, stringField, uuidField } from "./input.js"

type BroadcastRow = {
  id: string
  workspace_id: string
  created_by: string
  title: string
  description: string
  slug: string
  kind: BroadcastKind
  created_at: string | Date
  updated_at: string | Date
}

type ItemRow = {
  id: string
  broadcast_id: string
  title: string
  sort_order: number
  storage_bucket: string
  storage_path: string
  mime_type: string
  file_size_bytes: number
  duration_seconds: number | null
  created_at: string | Date
}

type PlaylistInput = {
  id: string | null
  title: string
  sortOrder: number
  storageBucket: string
  storagePath: string
  mimeType: string
  fileSizeBytes: number
  durationSeconds: number | null
  createdAt: string | null
}

const BROADCAST_FIELDS = `id, workspace_id, created_by, title, description, slug, kind, created_at, updated_at`
const ITEM_FIELDS = `id, broadcast_id, title, sort_order, storage_bucket, storage_path, mime_type, file_size_bytes, duration_seconds, created_at`
const kinds: readonly BroadcastKind[] = ["audio", "video"]

function fail(message: string, status = 400, code = "invalid_input"): never {
  throw Object.assign(new Error(message), { status, code })
}

function publicUrl(bucket: string, path: string): string {
  return makeUploadUrl(bucket, path)
}

function isoTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString()
}

function mapItem(row: ItemRow): BroadcastItem {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    title: row.title,
    sortOrder: row.sort_order,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: publicUrl(row.storage_bucket, row.storage_path),
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    createdAt: isoTimestamp(row.created_at),
  }
}

function mapBroadcast(row: BroadcastRow, items: ItemRow[]): Broadcast {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    slug: row.slug,
    kind: row.kind,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    items: items.map(mapItem).sort((left, right) => left.sortOrder - right.sortOrder),
  }
}

function readKind(value: unknown): BroadcastKind {
  if (typeof value !== "string" || !kinds.includes(value as BroadcastKind)) fail("Invalid broadcast kind")
  return value as BroadcastKind
}

function assertWorkspace(input: Record<string, unknown>, context: PlatformContext): void {
  const workspaceId = input.workspaceId
  if (workspaceId !== undefined && workspaceId !== context.workspaceId) fail("Workspace does not match the authorized workspace", 403, "forbidden")
}

function readItems(value: unknown): PlaylistInput[] {
  if (!Array.isArray(value) || value.length === 0) fail("A broadcast needs at least one playlist item")
  return value.map((entry, index) => {
    const input = objectInput(entry, ["id", "title", "sortOrder", "storageBucket", "storagePath", "publicUrl", "mimeType", "fileSizeBytes", "durationSeconds", "createdAt"])
    const idValue = input.id
    const id = idValue === null || idValue === undefined ? null : uuidField(input, "id")
    const title = stringField(input, "title").trim()
    const sortOrder = input.sortOrder
    const fileSizeBytes = input.fileSizeBytes
    const durationSeconds = input.durationSeconds
    const createdAtValue = input.createdAt
    if (!title) fail("Playlist item title is required")
    if (!Number.isSafeInteger(sortOrder) || sortOrder !== index) fail("Playlist ordering must be contiguous")
    if (!Number.isSafeInteger(fileSizeBytes) || Number(fileSizeBytes) < 0) fail("Invalid file size")
    if (durationSeconds !== null && (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds < 0)) fail("Invalid duration")
    if (createdAtValue !== null && createdAtValue !== undefined && typeof createdAtValue !== "string") fail("Invalid createdAt")
    if (id === null && createdAtValue !== null && createdAtValue !== undefined) fail("New playlist items cannot set createdAt")
    if (id !== null && typeof createdAtValue !== "string") fail("Existing playlist items require createdAt")
    return {
      id,
      title,
      sortOrder: Number(sortOrder),
      storageBucket: stringField(input, "storageBucket"),
      storagePath: stringField(input, "storagePath"),
      mimeType: stringField(input, "mimeType"),
      fileSizeBytes: Number(fileSizeBytes),
      durationSeconds: durationSeconds as number | null,
      createdAt: typeof createdAtValue === "string" ? createdAtValue : null,
    }
  })
}

async function validateNewItem(item: PlaylistInput, kind: BroadcastKind, context: PlatformContext): Promise<void> {
  if (item.id !== null) fail("New playlist items cannot include an id")
  if (item.storageBucket !== "broadcast-media") fail("Invalid broadcast media bucket")
  if (!item.mimeType.startsWith(`${kind}/`)) fail("Media type does not match the broadcast kind")
  const purpose = kind === "audio" ? "broadcast-audio" : "broadcast-video"
  const stored = await context.db.query<{ content_type: string; byte_size: string | number }>(
    `SELECT content_type, byte_size FROM moc_private.storage_objects
     WHERE bucket = $1 AND object_path = $2 AND owner_user_id = $3 AND workspace_id = $4 AND purpose = $5 LIMIT 1`,
    [item.storageBucket, item.storagePath, context.userId, context.workspaceId, purpose],
  )
  const object = stored.rows[0]
  if (!object || object.content_type !== item.mimeType || Number(object.byte_size) !== item.fileSizeBytes) {
    fail("Uploaded media could not be verified for this workspace", 409, "conflict")
  }
}

async function loadItems(context: PlatformContext, broadcastId: string): Promise<ItemRow[]> {
  const result = await context.db.query<ItemRow>(
    `SELECT ${ITEM_FIELDS} FROM public.broadcast_items WHERE broadcast_id = $1 ORDER BY sort_order ASC`,
    [broadcastId],
  )
  return result.rows
}

async function loadBroadcast(context: PlatformContext, id: string, workspaceId?: string): Promise<Broadcast | null> {
  const values = workspaceId ? [workspaceId, id] : [id]
  const where = workspaceId ? "workspace_id = $1 AND id = $2" : "id = $1"
  const result = await context.db.query<BroadcastRow>(`SELECT ${BROADCAST_FIELDS} FROM public.broadcasts WHERE ${where} LIMIT 1`, values)
  const row = result.rows[0]
  return row ? mapBroadcast(row, await loadItems(context, row.id)) : null
}

function sameItem(current: ItemRow, next: PlaylistInput): boolean {
  return current.id === next.id
    && current.title === next.title
    && current.storage_bucket === next.storageBucket
    && current.storage_path === next.storagePath
    && current.mime_type === next.mimeType
    && Number(current.file_size_bytes) === next.fileSizeBytes
    && (current.duration_seconds === null ? null : Number(current.duration_seconds)) === next.durationSeconds
    && next.createdAt !== null
    && isoTimestamp(current.created_at) === isoTimestamp(next.createdAt)
}

async function validateItems(context: PlatformContext, kind: BroadcastKind, items: PlaylistInput[], currentItems: ItemRow[] = []): Promise<void> {
  const currentById = new Map(currentItems.map((item) => [item.id, item]))
  for (const item of items) {
    if (item.id === null) {
      await validateNewItem(item, kind, context)
    } else {
      const current = currentById.get(item.id)
      if (!current || !sameItem(current, item)) fail("Existing playlist items cannot be changed", 409, "conflict")
    }
  }
}

async function writeItems(context: PlatformContext, broadcastId: string, items: PlaylistInput[]): Promise<void> {
  await context.db.query("DELETE FROM public.broadcast_items WHERE broadcast_id = $1", [broadcastId])
  for (const item of items) {
    await context.db.query(
      `INSERT INTO public.broadcast_items (id, broadcast_id, title, sort_order, storage_bucket, storage_path, public_url, mime_type, file_size_bytes, duration_seconds, created_at)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()))`,
      [item.id, broadcastId, item.title, item.sortOrder, item.storageBucket, item.storagePath, publicUrl(item.storageBucket, item.storagePath), item.mimeType, item.fileSizeBytes, item.durationSeconds, item.createdAt],
    )
  }
}

function conflict(message: string): never {
  return fail(message, 409, "conflict")
}

export const operations: Record<string, PlatformOperation> = {
  list: {
    permission: "can_read",
    async run(context) {
      const result = await context.db.query<BroadcastRow>(`SELECT ${BROADCAST_FIELDS} FROM public.broadcasts WHERE workspace_id = $1 ORDER BY updated_at DESC`, [context.workspaceId])
      return Promise.all(result.rows.map(async (row) => mapBroadcast(row, await loadItems(context, row.id))))
    },
  },
  getById: {
    permission: "can_read",
    async run(context, value) {
      const input = objectInput(value, ["id"])
      return await loadBroadcast(context, uuidField(input, "id"), context.workspaceId)
    },
  },
  getPublicById: {
    permission: "public",
    async run(context, value) {
      const input = objectInput(value, ["id"])
      return await loadBroadcast(context, uuidField(input, "id"))
    },
  },
  getPublicBySlug: {
    permission: "public",
    async run(context, value) {
      const input = objectInput(value, ["slug"])
      const slug = stringField(input, "slug")
      const result = await context.db.query<BroadcastRow>(`SELECT ${BROADCAST_FIELDS} FROM public.broadcasts WHERE slug = $1 LIMIT 1`, [slug])
      const row = result.rows[0]
      return row ? mapBroadcast(row, await loadItems(context, row.id)) : null
    },
  },
  create: {
    permission: "can_create",
    async run(context, value) {
      const input = objectInput(value, ["id", "workspaceId", "title", "description", "kind", "slug", "items"])
      assertWorkspace(input, context)
      const id = uuidField(input, "id")
      const title = stringField(input, "title").trim()
      const description = optionalStringField(input, "description")?.trim() ?? ""
      const slug = stringField(input, "slug").trim()
      const kind = readKind(input.kind)
      const items = readItems(input.items)
      if (!title || !slug) fail("Broadcast title and slug are required")
      if (items.some((item) => !item.mimeType.startsWith(`${kind}/`))) fail("Media type does not match the broadcast kind")
      await validateItems(context, kind, items)
      await context.db.query(
        `INSERT INTO public.broadcasts (id, workspace_id, created_by, title, description, slug, kind) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, context.workspaceId, context.userId, title, description, slug, kind],
      )
      await writeItems(context, id, items)
      await context.db.query("SELECT public.record_broadcast_revision($1, 'changed')", [id])
      const saved = await loadBroadcast(context, id, context.workspaceId)
      if (!saved) fail("The broadcast could not be loaded after creation", 500, "internal_error")
      return saved
    },
  },
  update: {
    permission: "can_update",
    async run(context, value) {
      const input = objectInput(value, ["id", "workspaceId", "expectedUpdatedAt", "title", "description", "kind", "items"])
      assertWorkspace(input, context)
      const id = uuidField(input, "id")
      const expectedUpdatedAt = stringField(input, "expectedUpdatedAt")
      const currentResult = await context.db.query<BroadcastRow>(
        `SELECT ${BROADCAST_FIELDS} FROM public.broadcasts WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [id, context.workspaceId],
      )
      const current = currentResult.rows[0]
      if (!current) fail("Broadcast not found", 404, "not_found")
      if (new Date(current.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) conflict("This broadcast changed after you opened it. Reload and try again.")
      if (readKind(input.kind) !== current.kind) fail("A broadcast's media kind cannot be changed")
      const title = stringField(input, "title").trim()
      const description = optionalStringField(input, "description")?.trim() ?? ""
      const items = readItems(input.items)
      if (!title) fail("Broadcast title is required")
      const currentItems = await loadItems(context, id)
      await validateItems(context, current.kind, items, currentItems)
      await writeItems(context, id, items)
      await context.db.query("UPDATE public.broadcasts SET title = $3, description = $4 WHERE id = $1 AND workspace_id = $2", [id, context.workspaceId, title, description])
      await context.db.query("SELECT public.record_broadcast_revision($1, 'changed')", [id])
      const saved = await loadBroadcast(context, id, context.workspaceId)
      if (!saved) fail("The broadcast could not be loaded after update", 500, "internal_error")
      return saved
    },
  },
  delete: {
    permission: "can_delete",
    async run(context, value) {
      const input = objectInput(value, ["id", "workspaceId"])
      assertWorkspace(input, context)
      const id = uuidField(input, "id")
      const result = await context.db.query<BroadcastRow>(`SELECT ${BROADCAST_FIELDS} FROM public.broadcasts WHERE id = $1 AND workspace_id = $2 FOR UPDATE`, [id, context.workspaceId])
      const broadcast = result.rows[0]
      if (!broadcast) fail("Broadcast not found", 404, "not_found")
      const items = await loadItems(context, id)
      await context.db.query("DELETE FROM public.broadcasts WHERE id = $1 AND workspace_id = $2", [id, context.workspaceId])
      await context.db.query("SELECT public.record_broadcast_revision($1, 'deleted')", [id])
      return { storagePaths: items.map((item) => item.storage_path), kind: broadcast.kind }
    },
  },
}
