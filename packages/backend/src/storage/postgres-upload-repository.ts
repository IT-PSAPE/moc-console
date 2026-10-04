import type { PoolClient, QueryResultRow } from "pg"
import type { StorageBucket, UploadPurpose } from "./upload-protocol.js"
import type { StoredChunk, UploadManifest, UploadRepository, UploadStatus } from "./upload-service.js"

type SqlClient = Pick<PoolClient, "query">

type UploadRow = QueryResultRow & {
  id: string
  owner_user_id: string
  workspace_id: string | null
  purpose: UploadPurpose
  bucket: StorageBucket
  object_path: string
  staging_prefix: string
  file_name: string
  expected_size: string | number
  content_type: string
  expected_chunks: number
  status: UploadStatus
  completed_sha256: string | null
  error_code: string | null
}

type ChunkRow = QueryResultRow & { chunk_index: number; staging_key: string; byte_size: number; sha256: string }

const UPLOAD_COLUMNS = `id, owner_user_id, workspace_id, purpose, bucket, object_path,
  staging_prefix, file_name, expected_size, content_type, expected_chunks, status,
  completed_sha256, error_code`

function toManifest(row: UploadRow): UploadManifest {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    purpose: row.purpose,
    bucket: row.bucket,
    objectPath: row.object_path,
    stagingPrefix: row.staging_prefix,
    fileName: row.file_name,
    size: Number(row.expected_size),
    contentType: row.content_type,
    expectedChunks: row.expected_chunks,
    status: row.status,
    contentHash: row.completed_sha256,
    errorCode: row.error_code,
  }
}

export class PostgresUploadRepository implements UploadRepository {
  constructor(private readonly db: SqlClient) {}

  async create(manifest: UploadManifest): Promise<void> {
    await this.db.query(
      `INSERT INTO moc_private.storage_uploads
       (id, owner_user_id, workspace_id, purpose, bucket, object_path, staging_prefix,
        file_name, expected_size, content_type, expected_chunks, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + interval '24 hours')`,
      [manifest.id, manifest.ownerUserId, manifest.workspaceId, manifest.purpose, manifest.bucket,
        manifest.objectPath, manifest.stagingPrefix, manifest.fileName, manifest.size,
        manifest.contentType, manifest.expectedChunks],
    )
  }

  async get(id: string): Promise<UploadManifest | null> {
    const result = await this.db.query<UploadRow>(
      `SELECT ${UPLOAD_COLUMNS} FROM moc_private.storage_uploads WHERE id = $1`, [id],
    )
    return result.rows[0] ? toManifest(result.rows[0]) : null
  }

  async chunksFor(id: string): Promise<StoredChunk[]> {
    const result = await this.db.query<ChunkRow>(
      `SELECT chunk_index, staging_key, byte_size, sha256
       FROM moc_private.storage_upload_chunks WHERE upload_id = $1 ORDER BY chunk_index`, [id],
    )
    return result.rows.map((row) => ({ index: row.chunk_index, key: row.staging_key, size: row.byte_size, sha256: row.sha256 }))
  }

  async addChunk(id: string, index: number, chunk: Omit<StoredChunk, "index">): Promise<"created" | "same" | "conflict"> {
    const inserted = await this.db.query(
      `INSERT INTO moc_private.storage_upload_chunks(upload_id, chunk_index, byte_size, sha256, staging_key)
       SELECT $1, $2, $3, $4, $5
       WHERE EXISTS (SELECT 1 FROM moc_private.storage_uploads WHERE id = $1 AND status = 'uploading')
       ON CONFLICT (upload_id, chunk_index) DO NOTHING
       RETURNING chunk_index`, [id, index, chunk.size, chunk.sha256, chunk.key],
    )
    if (inserted.rowCount) return "created"

    const current = await this.db.query<ChunkRow>(
      `SELECT chunk_index, staging_key, byte_size, sha256
       FROM moc_private.storage_upload_chunks WHERE upload_id = $1 AND chunk_index = $2`, [id, index],
    )
    const prior = current.rows[0]
    if (prior) return prior.sha256 === chunk.sha256 && prior.byte_size === chunk.size ? "same" : "conflict"
    throw new Error("Upload session is closed or missing")
  }

  async enqueue(id: string): Promise<void> {
    const result = await this.db.query<{ status: UploadStatus } & QueryResultRow>(
      `SELECT moc_private.enqueue_storage_upload($1) AS status`, [id],
    )
    const status = result.rows[0]?.status
    if (status !== "queued" && status !== "processing" && status !== "complete") {
      throw new Error("Upload session cannot be finalized")
    }
  }

  async abort(id: string): Promise<void> {
    const result = await this.db.query<{ status: UploadStatus } & QueryResultRow>(
      `SELECT moc_private.abort_storage_upload($1) AS status`, [id],
    )
    if (result.rows[0]?.status !== "aborted") throw new Error("Upload session cannot be aborted")
  }
}
