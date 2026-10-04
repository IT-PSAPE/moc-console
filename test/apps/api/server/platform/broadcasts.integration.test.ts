import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { withActor } from "@moc/backend/database"
import type { PlatformContext, PlatformOperation } from "../../../../../apps/api/server/platform/context"
import { operations as broadcastOperations } from "../../../../../apps/api/server/platform/broadcasts"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const userId = randomUUID()
const workspaceId = randomUUID()
const createRoleId = randomUUID()
const updateRoleId = randomUUID()
const broadcastId = randomUUID()
const firstObjectPath = `${workspaceId}/${userId}/managed/first.mp3`
const secondObjectPath = `${workspaceId}/${userId}/managed/second.mp3`

async function runOperation<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId, workspaceId, role: "moc_app" }, async (db) => operation.run({ db, userId, workspaceId }, input) as Promise<T>)
}

async function runPublicOperation<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId: null, workspaceId: null, role: "moc_public" }, async (db) => operation.run({ db, userId: "", workspaceId: "" }, input) as Promise<T>)
}

async function assignRole(roleId: string): Promise<void> {
  await pool!.query("UPDATE public.workspace_users SET role_id=$3 WHERE workspace_id=$1 AND user_id=$2", [workspaceId, userId, roleId])
}

suite("Broadcast platform operations against local Neon PostgreSQL", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query("INSERT INTO moc_auth.\"user\" (id,name,email) VALUES ($1,'Broadcast Integration',$2)", [userId, `broadcast-${userId}@example.test`])
    await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Broadcast','Tester',$2)", [userId, `broadcast-${userId}@example.test`])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Broadcast ${workspaceId}`, `broadcast-${workspaceId}`])
    await pool.query("INSERT INTO public.roles (id,name,can_create,can_read,can_update,can_delete,can_manage_roles) VALUES ($1,$2,true,true,false,false,false),($3,$4,false,true,true,false,false)", [createRoleId, `broadcast-create-${userId}`, updateRoleId, `broadcast-update-${userId}`])
    await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) VALUES ($1,$2,$3)", [workspaceId, userId, createRoleId])
    await pool.query(`INSERT INTO moc_private.storage_objects (bucket,object_path,owner_user_id,workspace_id,purpose,byte_size,content_type,sha256)
      VALUES ('broadcast-media',$1,$2,$3,'broadcast-audio',100,'audio/mpeg',repeat('a',64)),
             ('broadcast-media',$4,$2,$3,'broadcast-audio',200,'audio/mpeg',repeat('b',64))`, [firstObjectPath, userId, workspaceId, secondObjectPath])
  })

  afterAll(async () => {
    if (!pool) return
    await pool.query("DELETE FROM public.broadcast_revisions WHERE broadcast_id=$1", [broadcastId])
    await pool.query("DELETE FROM public.broadcast_revision_counters WHERE broadcast_id=$1", [broadcastId])
    await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
    await pool.query("DELETE FROM moc_private.storage_objects WHERE owner_user_id=$1", [userId])
    await pool.query("DELETE FROM moc_auth.\"user\" WHERE id=$1", [userId])
    await pool.query("DELETE FROM public.roles WHERE id=ANY($1::uuid[])", [[createRoleId, updateRoleId]])
    await pool.end()
  })

  test("create-only can create a broadcast, public reads work, and revisions commit with writes", async () => {
    const created = await runOperation<{ id: string; slug: string; items: Array<{ id: string; sortOrder: number; createdAt: string }> }>(broadcastOperations.create, {
      id: broadcastId,
      workspaceId,
      title: "Integration broadcast",
      description: "Custom role create test",
      slug: `broadcast-${broadcastId}`,
      kind: "audio",
      items: [
        { id: null, title: "First", sortOrder: 0, storageBucket: "broadcast-media", storagePath: firstObjectPath, publicUrl: "ignored", mimeType: "audio/mpeg", fileSizeBytes: 100, durationSeconds: 10, createdAt: null },
        { id: null, title: "Second", sortOrder: 1, storageBucket: "broadcast-media", storagePath: secondObjectPath, publicUrl: "ignored", mimeType: "audio/mpeg", fileSizeBytes: 200, durationSeconds: 20, createdAt: null },
      ],
    })
    expect(created).toMatchObject({ id: broadcastId, items: [{ title: "First", sortOrder: 0 }, { title: "Second", sortOrder: 1 }] })
    expect(created.items[0].createdAt).toBeTruthy()

    const publicById = await runPublicOperation<{ id: string; items: Array<{ title: string }> }>(broadcastOperations.getPublicById, { id: broadcastId })
    const publicBySlug = await runPublicOperation<{ id: string }>(broadcastOperations.getPublicBySlug, { slug: created.slug })
    expect(publicById).toMatchObject({ id: broadcastId, items: [{ title: "First" }, { title: "Second" }] })
    expect(publicBySlug.id).toBe(broadcastId)

    const revisions = await pool!.query("SELECT revision, change_type FROM public.broadcast_revisions WHERE broadcast_id=$1", [broadcastId])
    expect(revisions.rows).toEqual([{ revision: "1", change_type: "changed" }])
  })

  test("update-only can reorder existing items without create or delete permission", async () => {
    await assignRole(updateRoleId)
    const current = await runOperation<{ updatedAt: string; items: Array<{ id: string; title: string; sortOrder: number; storageBucket: string; storagePath: string; mimeType: string; fileSizeBytes: number; durationSeconds: number | null; createdAt: string }> }>(broadcastOperations.getById, { id: broadcastId })
    const items = [...current.items].reverse().map((item, index) => ({
      id: item.id,
      title: item.title,
      sortOrder: index,
      storageBucket: item.storageBucket,
      storagePath: item.storagePath,
      publicUrl: "ignored",
      mimeType: item.mimeType,
      fileSizeBytes: item.fileSizeBytes,
      durationSeconds: item.durationSeconds,
      createdAt: item.createdAt,
    }))
    const updated = await runOperation<{ items: Array<{ id: string; title: string; sortOrder: number }> }>(broadcastOperations.update, {
      id: broadcastId,
      workspaceId,
      expectedUpdatedAt: current.updatedAt,
      title: "Integration broadcast reordered",
      description: "Update-only role",
      kind: "audio",
      items,
    })
    expect(updated.items.map((item) => [item.title, item.sortOrder])).toEqual([["Second", 0], ["First", 1]])
    const revisions = await pool!.query("SELECT revision, change_type FROM public.broadcast_revisions WHERE broadcast_id=$1 ORDER BY revision", [broadcastId])
    expect(revisions.rows).toEqual([{ revision: "1", change_type: "changed" }, { revision: "2", change_type: "changed" }])

    await expect(withActor({ userId, workspaceId, role: "moc_app" }, async (db) => {
      const context: PlatformContext = { db, userId, workspaceId }
      await broadcastOperations.update.run(context, {
        id: broadcastId,
        workspaceId,
        expectedUpdatedAt: updated.items.length ? (await db.query<{ updated_at: string }>("SELECT updated_at::text FROM public.broadcasts WHERE id=$1", [broadcastId])).rows[0].updated_at : "",
        title: "Rolled back title",
        description: "This operation must roll back",
        kind: "audio",
        items: updated.items.map((item, index) => {
          const original = current.items.find((candidate) => candidate.id === item.id)!
          return { id: original.id, title: original.title, sortOrder: index, storageBucket: original.storageBucket, storagePath: original.storagePath, publicUrl: "ignored", mimeType: original.mimeType, fileSizeBytes: original.fileSizeBytes, durationSeconds: original.durationSeconds, createdAt: original.createdAt }
        }),
      })
      throw new Error("rollback after completed operation")
    })).rejects.toThrow("rollback after completed operation")
    const rolledBack = await pool!.query("SELECT title FROM public.broadcasts WHERE id=$1", [broadcastId])
    const revisionsAfterRollback = await pool!.query("SELECT revision FROM public.broadcast_revisions WHERE broadcast_id=$1 ORDER BY revision", [broadcastId])
    expect(rolledBack.rows[0].title).toBe("Integration broadcast reordered")
    expect(revisionsAfterRollback.rows).toEqual([{ revision: "1" }, { revision: "2" }])
  })
})
