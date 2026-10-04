import { describe, expect, test } from "bun:test"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/broadcasts"

const workspaceId = "11111111-1111-4111-8111-111111111111"
const userId = "22222222-2222-4222-8222-222222222222"
const broadcastId = "33333333-3333-4333-8333-333333333333"
const updatedAt = "2026-10-04T10:00:00.000Z"

type QueryCall = { sql: string; values: unknown[] }
type MockDatabase = { context: PlatformContext; calls: QueryCall[] }

function createMockDatabase(options: {
  broadcastRows?: Array<Record<string, unknown>>
  itemRows?: Array<Record<string, unknown>>
  storageRows?: Array<Record<string, unknown>>
} = {}): MockDatabase {
  const calls: QueryCall[] = []
  const db = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values })
      if (sql.includes("FROM public.broadcasts") && sql.startsWith("SELECT")) {
        return { rows: options.broadcastRows ?? [], rowCount: options.broadcastRows?.length ?? 0 }
      }
      if (sql.includes("FROM public.broadcast_items") && sql.startsWith("SELECT")) {
        return { rows: options.itemRows ?? [], rowCount: options.itemRows?.length ?? 0 }
      }
      if (sql.includes("FROM moc_private.storage_objects")) {
        return { rows: options.storageRows ?? [], rowCount: options.storageRows?.length ?? 0 }
      }
      return { rows: [], rowCount: 1 }
    },
  }
  return {
    calls,
    context: { db: db as unknown as PlatformContext["db"], userId, workspaceId },
  }
}

function broadcastRow(overrides: Record<string, unknown> = {}) {
  return {
    id: broadcastId,
    workspace_id: workspaceId,
    created_by: userId,
    title: "Radio",
    description: "",
    slug: "radio",
    kind: "audio",
    created_at: "2026-10-04T09:00:00.000Z",
    updated_at: updatedAt,
    ...overrides,
  }
}

describe("broadcast platform operations", () => {
  test("creates a workspace-scoped playlist and records its first revision in the same operation", async () => {
    const database = createMockDatabase({
      broadcastRows: [broadcastRow()],
      storageRows: [{ content_type: "audio/mpeg", byte_size: 100 }],
    })
    const item = {
      id: null,
      title: "Opening track.mp3",
      sortOrder: 0,
      storageBucket: "broadcast-media",
      storagePath: `${workspaceId}/${userId}/media.mp3`,
      publicUrl: "https://untrusted.example/media.mp3",
      mimeType: "audio/mpeg",
      fileSizeBytes: 100,
      durationSeconds: 5,
      createdAt: null,
    }

    const result = await operations.create.run(database.context, {
      id: broadcastId,
      workspaceId,
      title: "Radio",
      description: "",
      kind: "audio",
      slug: "radio",
      items: [item],
    })

    expect(result).toMatchObject({ id: broadcastId, workspaceId, items: [] })
    const insert = database.calls.find((call) => call.sql.includes("INSERT INTO public.broadcasts"))
    expect(insert?.values).toEqual([broadcastId, workspaceId, userId, "Radio", "", "radio", "audio"])
    const itemInsert = database.calls.find((call) => call.sql.includes("INSERT INTO public.broadcast_items"))
    expect(itemInsert?.values[6]).toBe(`/api/storage/broadcast-media/${item.storagePath.split("/").map(encodeURIComponent).join("/")}`)
    expect(database.calls.some((call) => call.sql.includes("record_broadcast_revision") && call.values[0] === broadcastId)).toBe(true)
  })

  test("accepts a runtime-managed media path without changing its exact storage metadata", async () => {
    const managedPath = `moc-uploads/${workspaceId}/${userId}/broadcast-media/managed-track.mp3`
    const database = createMockDatabase({
      broadcastRows: [broadcastRow()],
      storageRows: [{ content_type: "audio/mpeg", byte_size: 100 }],
    })

    await operations.create.run(database.context, {
      id: broadcastId,
      workspaceId,
      title: "Radio",
      description: "",
      kind: "audio",
      slug: "radio-managed",
      items: [{
        id: null, title: "Track", sortOrder: 0, storageBucket: "broadcast-media", storagePath: managedPath,
        mimeType: "audio/mpeg", fileSizeBytes: 100, durationSeconds: 5, createdAt: null,
      }],
    })

    const storageLookup = database.calls.find((call) => call.sql.includes("FROM moc_private.storage_objects"))
    expect(storageLookup?.values).toEqual(["broadcast-media", managedPath, userId, workspaceId, "broadcast-audio"])
    const itemInsert = database.calls.find((call) => call.sql.includes("INSERT INTO public.broadcast_items"))
    expect(itemInsert?.values.slice(4, 10)).toEqual([
      "broadcast-media", managedPath,
      `/api/storage/broadcast-media/${managedPath.split("/").map(encodeURIComponent).join("/")}`,
      "audio/mpeg", 100, 5,
    ])
  })

  test("allows reordering existing items while preserving each item's exact media metadata", async () => {
    const first = {
      id: "44444444-4444-4444-8444-444444444444",
      broadcast_id: broadcastId,
      title: "First",
      sort_order: 0,
      storage_bucket: "broadcast-media",
      storage_path: `moc-uploads/${workspaceId}/${userId}/broadcast-media/first.mp3`,
      mime_type: "audio/mpeg",
      file_size_bytes: 100,
      duration_seconds: 5,
      created_at: updatedAt,
    }
    const second = {
      ...first,
      id: "55555555-5555-4555-8555-555555555555",
      title: "Second",
      sort_order: 1,
      storage_path: `moc-uploads/${workspaceId}/${userId}/broadcast-media/second.mp3`,
      file_size_bytes: 200,
      duration_seconds: 10,
    }
    const database = createMockDatabase({ broadcastRows: [broadcastRow()], itemRows: [first, second] })

    await operations.update.run(database.context, {
      id: broadcastId,
      workspaceId,
      expectedUpdatedAt: updatedAt,
      title: "Radio",
      description: "",
      kind: "audio",
      items: [
        { id: second.id, title: second.title, sortOrder: 0, storageBucket: second.storage_bucket, storagePath: second.storage_path, mimeType: second.mime_type, fileSizeBytes: second.file_size_bytes, durationSeconds: second.duration_seconds, createdAt: second.created_at },
        { id: first.id, title: first.title, sortOrder: 1, storageBucket: first.storage_bucket, storagePath: first.storage_path, mimeType: first.mime_type, fileSizeBytes: first.file_size_bytes, durationSeconds: first.duration_seconds, createdAt: first.created_at },
      ],
    })

    const inserts = database.calls.filter((call) => call.sql.includes("INSERT INTO public.broadcast_items"))
    expect(inserts.map((call) => [call.values[0], call.values[3]])).toEqual([[second.id, 0], [first.id, 1]])
    expect(inserts.map((call) => call.values.slice(4, 10))).toEqual([
      [second.storage_bucket, second.storage_path, `/api/storage/broadcast-media/${second.storage_path.split("/").map(encodeURIComponent).join("/")}`, second.mime_type, second.file_size_bytes, second.duration_seconds],
      [first.storage_bucket, first.storage_path, `/api/storage/broadcast-media/${first.storage_path.split("/").map(encodeURIComponent).join("/")}`, first.mime_type, first.file_size_bytes, first.duration_seconds],
    ])
    expect(database.calls.some((call) => call.sql.includes("record_broadcast_revision($1, 'changed')"))).toBe(true)
  })

  test("continues to reject changes to existing item metadata even when its order changes", async () => {
    const first = {
      id: "44444444-4444-4444-8444-444444444444",
      broadcast_id: broadcastId,
      title: "Original",
      sort_order: 0,
      storage_bucket: "broadcast-media",
      storage_path: `moc-uploads/${workspaceId}/${userId}/broadcast-media/original.mp3`,
      mime_type: "audio/mpeg",
      file_size_bytes: 100,
      duration_seconds: 5,
      created_at: updatedAt,
    }
    const second = {
      ...first,
      id: "55555555-5555-4555-8555-555555555555",
      title: "Second",
      sort_order: 1,
      storage_path: `moc-uploads/${workspaceId}/${userId}/broadcast-media/second.mp3`,
    }
    const database = createMockDatabase({ broadcastRows: [broadcastRow()], itemRows: [first, second] })

    await expect(operations.update.run(database.context, {
      id: broadcastId,
      workspaceId,
      expectedUpdatedAt: updatedAt,
      title: "Radio",
      description: "",
      kind: "audio",
      items: [
        { id: second.id, title: second.title, sortOrder: 0, storageBucket: second.storage_bucket, storagePath: second.storage_path, mimeType: second.mime_type, fileSizeBytes: second.file_size_bytes, durationSeconds: second.duration_seconds, createdAt: second.created_at },
        { id: first.id, title: "Edited title", sortOrder: 1, storageBucket: first.storage_bucket, storagePath: first.storage_path, mimeType: first.mime_type, fileSizeBytes: first.file_size_bytes, durationSeconds: first.duration_seconds, createdAt: first.created_at },
      ],
    })).rejects.toMatchObject({ status: 409, code: "conflict" })

    expect(database.calls.some((call) => call.sql.startsWith("DELETE FROM public.broadcast_items"))).toBe(false)
  })

  test("rejects a stale playlist lock before issuing any mutation query", async () => {
    const database = createMockDatabase({ broadcastRows: [broadcastRow()] })

    await expect(operations.update.run(database.context, {
      id: broadcastId,
      workspaceId,
      expectedUpdatedAt: "2026-10-04T09:59:59.000Z",
      title: "Changed",
      description: "",
      kind: "audio",
      items: [{
        id: null,
        title: "Track",
        sortOrder: 0,
        storageBucket: "broadcast-media",
        storagePath: `${workspaceId}/${userId}/new.mp3`,
        mimeType: "audio/mpeg",
        fileSizeBytes: 100,
        durationSeconds: null,
        createdAt: null,
      }],
    })).rejects.toMatchObject({ status: 409, code: "conflict" })

    expect(database.calls.some((call) => call.sql.startsWith("UPDATE public.broadcasts"))).toBe(false)
    expect(database.calls.some((call) => call.sql.startsWith("DELETE FROM public.broadcast_items"))).toBe(false)
  })

  test("rejects media without a matching actor-owned storage object before writing a broadcast", async () => {
    const database = createMockDatabase()

    await expect(operations.create.run(database.context, {
      id: broadcastId,
      workspaceId,
      title: "Radio",
      description: "",
      kind: "audio",
      slug: "radio",
      items: [{
        id: null,
        title: "Forged track",
        sortOrder: 0,
        storageBucket: "broadcast-media",
        storagePath: `${workspaceId}/${userId}/not-uploaded.mp3`,
        publicUrl: "https://untrusted.example/not-uploaded.mp3",
        mimeType: "audio/mpeg",
        fileSizeBytes: 100,
        durationSeconds: null,
        createdAt: null,
      }],
    })).rejects.toMatchObject({ status: 409, code: "conflict" })

    expect(database.calls.some((call) => call.sql.includes("INSERT INTO public.broadcasts"))).toBe(false)
    expect(database.calls.some((call) => call.sql.includes("record_broadcast_revision"))).toBe(false)
  })

  test("deletes the scoped playlist and records a tombstone revision", async () => {
    const item = {
      id: "44444444-4444-4444-8444-444444444444",
      broadcast_id: broadcastId,
      title: "Track",
      sort_order: 0,
      storage_bucket: "broadcast-media",
      storage_path: `${workspaceId}/${userId}/track.mp3`,
      mime_type: "audio/mpeg",
      file_size_bytes: 100,
      duration_seconds: 5,
      created_at: updatedAt,
    }
    const database = createMockDatabase({ broadcastRows: [broadcastRow()], itemRows: [item] })

    const result = await operations.delete.run(database.context, { id: broadcastId, workspaceId })

    expect(result).toEqual({ storagePaths: [item.storage_path], kind: "audio" })
    expect(database.calls.some((call) => call.sql.includes("record_broadcast_revision($1, 'deleted')"))).toBe(true)
    expect(database.calls.find((call) => call.sql.startsWith("DELETE FROM public.broadcasts"))?.values).toEqual([broadcastId, workspaceId])
  })
})
