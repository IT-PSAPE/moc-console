import { describe, expect, test } from "bun:test"
import type { PoolClient, QueryResult, QueryResultRow } from "pg"
import { PostgresUploadRepository } from "../../../../packages/backend/src/storage/postgres-upload-repository"
import { StorageUploadService } from "../../../../packages/backend/src/storage/upload-service"

type Row = Record<string, unknown> & QueryResultRow
type Chunk = { chunk_index: number; staging_key: string; byte_size: number; sha256: string }

describe("PostgresUploadRepository app-role lifecycle", () => {
  test("creates, stages mock bytes, finalizes and aborts through owner-scoped SQL functions", async () => {
    const uploadId = "11111111-1111-4111-8111-111111111111"
    const ownerId = "22222222-2222-4222-8222-222222222222"
    const queries: string[] = []
    const chunks: Chunk[] = []
    const staged = new Map<string, Uint8Array>()
    const deletedObjects: string[] = []
    let upload: Row | null = null

    const client = {
      async query<Result extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<Result>> {
        queries.push(text)
        let rows: Row[] = []
        if (text.includes("INSERT INTO moc_private.storage_uploads")) {
          upload = {
            id: values[0], owner_user_id: values[1], workspace_id: values[2], purpose: values[3],
            bucket: values[4], object_path: values[5], staging_prefix: values[6], file_name: values[7],
            expected_size: values[8], content_type: values[9], expected_chunks: values[10],
            status: "uploading", completed_sha256: null, error_code: null,
          } as Row
        } else if (text.includes("INSERT INTO moc_private.storage_upload_chunks")) {
          chunks.push({ upload_id: values[0], chunk_index: values[1], byte_size: values[2], sha256: values[3], staging_key: values[4] } as Chunk)
          rows = [{ chunk_index: values[1] } as Row]
        } else if (text.includes("SELECT chunk_index, staging_key, byte_size, sha256")) {
          rows = chunks.filter((chunk) => text.includes("chunk_index = $2") ? chunk.chunk_index === values[1] : true) as unknown as Row[]
        } else if (text.includes("SELECT id, owner_user_id")) {
          rows = upload ? [upload] : []
        } else if (text.includes("moc_private.enqueue_storage_upload")) {
          if (upload) upload.status = "queued"
          rows = [{ status: "queued" } as Row]
        } else if (text.includes("moc_private.abort_storage_upload")) {
          if (upload) upload.status = "aborted"
          rows = [{ status: "aborted" } as Row]
        }
        return { rows: rows as Result[], rowCount: rows.length, command: "", oid: 0, fields: [] } as QueryResult<Result>
      },
    } as unknown as Pick<PoolClient, "query">
    const objectStore = {
      async putStaging(key: string, body: Uint8Array) { staged.set(key, body.slice()) },
      async deleteStaging(keys: string[]) { for (const key of keys) staged.delete(key) },
      async deleteObject(bucket: string, path: string) { deletedObjects.push(`${bucket}/${path}`) },
    }
    const repository = new PostgresUploadRepository(client)
    const service = new StorageUploadService(repository, objectStore, () => uploadId)
    const bytes = new Uint8Array([1, 2, 3])

    const manifest = await service.create({ ownerUserId: ownerId, purpose: "avatar", size: bytes.byteLength, contentType: "image/png", fileName: "avatar.png" })
    expect(await service.putChunk(ownerId, uploadId, 0, bytes, "image/png")).toEqual({ duplicate: false })
    expect(staged.size).toBe(1)
    expect(await service.finalize(ownerId, uploadId)).toEqual({ status: "queued" })
    expect(await service.abort(ownerId, uploadId)).toEqual({ status: "aborted" })

    expect(manifest.ownerUserId).toBe(ownerId)
    expect(queries.some((sql) => sql.includes("moc_private.enqueue_storage_upload($1)"))).toBe(true)
    expect(queries.some((sql) => sql.includes("moc_private.abort_storage_upload($1)"))).toBe(true)
    expect(queries.some((sql) => sql.includes("storage_finalize_jobs"))).toBe(false)
    expect(staged.size).toBe(0)
    expect(deletedObjects).toEqual([`${manifest.bucket}/${manifest.objectPath}`])
  })
})
