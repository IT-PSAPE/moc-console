import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { withActor } from "../../../../packages/backend/src/database"
import { PostgresUploadRepository } from "../../../../packages/backend/src/storage/postgres-upload-repository"
import { StorageUploadService } from "../../../../packages/backend/src/storage/upload-service"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const ownerId = randomUUID()
const otherUserId = randomUUID()
const uploadId = randomUUID()
const bytes = new Uint8Array([13, 37, 42, 88])

if (databaseUrl) process.env.DATABASE_URL = databaseUrl

describe.skipIf(!databaseUrl)("Storage upload app-role permissions against local PostgreSQL", () => {
  beforeAll(() => {
    if (databaseUrl) process.env.DATABASE_URL = databaseUrl
  })

  afterAll(async () => {
    if (!databaseUrl) return
    await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
      await db.query("DELETE FROM moc_private.storage_uploads WHERE id = $1", [uploadId])
    })
  })

  test("moc_app can enqueue and abort only its own uploads and cannot edit worker jobs", async () => {
    const staged = new Map<string, Uint8Array>()
    const objectStore = {
      async putStaging(key: string, body: Uint8Array) { staged.set(key, body.slice()) },
      async deleteStaging(keys: string[]) { for (const key of keys) staged.delete(key) },
      async deleteObject() {},
    }
    const manifest = await withActor({ userId: ownerId, workspaceId: null, role: "moc_app" }, async (db) => {
      const service = new StorageUploadService(new PostgresUploadRepository(db), objectStore, () => uploadId)
      const created = await service.create({ ownerUserId: ownerId, purpose: "avatar", size: bytes.byteLength, contentType: "image/png", fileName: "avatar.png" })
      await service.putChunk(ownerId, uploadId, 0, bytes, "image/png")
      expect(await service.finalize(ownerId, uploadId)).toEqual({ status: "queued" })
      return created
    })

    await expect(withActor({ userId: otherUserId, workspaceId: null, role: "moc_app" }, async (db) =>
      db.query("SELECT moc_private.enqueue_storage_upload($1)", [uploadId]),
    )).rejects.toMatchObject({ code: "P0002" })
    await expect(withActor({ userId: otherUserId, workspaceId: null, role: "moc_app" }, async (db) =>
      db.query("SELECT moc_private.abort_storage_upload($1)", [uploadId]),
    )).rejects.toMatchObject({ code: "P0002" })

    await expect(withActor({ userId: ownerId, workspaceId: null, role: "moc_app" }, async (db) =>
      db.query("UPDATE moc_private.storage_finalize_jobs SET state = 'processing' WHERE upload_id = $1", [uploadId]),
    )).rejects.toMatchObject({ code: "42501" })

    const queued = await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
      const upload = await db.query<{ status: string }>("SELECT status FROM moc_private.storage_uploads WHERE id = $1", [uploadId])
      const job = await db.query<{ state: string; attempt: number }>("SELECT state, attempt FROM moc_private.storage_finalize_jobs WHERE upload_id = $1", [uploadId])
      return { upload: upload.rows[0], job: job.rows[0] }
    })
    expect(queued).toEqual({ upload: { status: "queued" }, job: { state: "queued", attempt: 0 } })

    await withActor({ userId: ownerId, workspaceId: null, role: "moc_app" }, async (db) => {
      const service = new StorageUploadService(new PostgresUploadRepository(db), objectStore, () => uploadId)
      expect(await service.abort(ownerId, uploadId)).toEqual({ status: "aborted" })
    })
    const aborted = await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
      const upload = await db.query<{ status: string }>("SELECT status FROM moc_private.storage_uploads WHERE id = $1", [uploadId])
      const job = await db.query<{ state: string; lease_token: string | null; lease_until: Date | null }>("SELECT state, lease_token, lease_until FROM moc_private.storage_finalize_jobs WHERE upload_id = $1", [uploadId])
      return { upload: upload.rows[0], job: job.rows[0] }
    })
    expect(aborted).toEqual({ upload: { status: "aborted" }, job: { state: "aborted", lease_token: null, lease_until: null } })
    expect(staged.size).toBe(0)
    expect(manifest.ownerUserId).toBe(ownerId)
  })
})
