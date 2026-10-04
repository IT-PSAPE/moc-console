import { createHash, randomUUID } from "node:crypto"
import { DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { withActor } from "../database.js"
import { ASSEMBLY_PART_SIZE } from "./upload-protocol.js"
import { abortMultipart, completeMultipart, deleteStorageObjects, getStorageClient, hashStorageObject, headStorageObject, listManagedMultipartUploads, listStagingObjects, putMultipartPart, readStagingObject, S3UploadObjectStore, startMultipart } from "./s3.js"

type FinalizeJob = {
  jobId: string
  uploadId: string
  leaseToken: string
  ownerUserId: string
  workspaceId: string | null
  bucket: string
  objectPath: string
  contentType: string
  expectedSize: number
  expectedHash: string | null
  status: string
  multipartUploadId: string | null
  completedParts: Array<{ PartNumber: number; ETag: string }>
}

type ChunkRow = { staging_key: string; byte_size: number; sha256: string }

type ClaimedJob = {
  id: string
  upload_id: string
  owner_user_id: string
  workspace_id: string | null
  bucket: string
  object_path: string
  content_type: string
  expected_size: number
  expected_sha256: string | null
  upload_status: string
  multipart_upload_id: string | null
  completed_parts: Array<{ PartNumber: number; ETag: string }>
  lease_token: string
}

async function claimJob(): Promise<FinalizeJob | null> {
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const result = await db.query<ClaimedJob>(
      `WITH candidate AS (
       SELECT id FROM moc_private.storage_finalize_jobs
         WHERE ((state = 'queued' AND next_attempt_at <= now())
           OR (state = 'processing' AND lease_until < now()))
           AND EXISTS (SELECT 1 FROM moc_private.storage_uploads u WHERE u.id = upload_id AND u.status IN ('queued', 'processing'))
         ORDER BY next_attempt_at, created_at
         FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE moc_private.storage_finalize_jobs job
       SET state = 'processing', attempt = attempt + 1,
           lease_token = $1, lease_until = now() + interval '2 minutes', updated_at = now()
       FROM candidate, moc_private.storage_uploads upload
       WHERE job.id = candidate.id AND upload.id = job.upload_id
       RETURNING job.id, job.upload_id, job.multipart_upload_id, job.completed_parts,
         job.lease_token, upload.owner_user_id, upload.workspace_id, upload.bucket,
         upload.object_path, upload.content_type, upload.expected_size,
         upload.expected_sha256, upload.status AS upload_status`, [randomUUID()],
    )
    const row = result.rows[0]
    if (!row) return null
    await db.query(
      `UPDATE moc_private.storage_uploads SET status = 'processing', updated_at = now()
       WHERE id = $1 AND status IN ('queued', 'processing')`, [row.upload_id],
    )
    return {
      jobId: row.id,
      uploadId: row.upload_id,
      leaseToken: row.lease_token,
      ownerUserId: row.owner_user_id,
      workspaceId: row.workspace_id,
      bucket: row.bucket,
      objectPath: row.object_path,
      contentType: row.content_type,
      expectedSize: Number(row.expected_size),
      expectedHash: row.expected_sha256,
      status: row.upload_status,
      multipartUploadId: row.multipart_upload_id,
      completedParts: row.completed_parts ?? [],
    }
  })
}

async function readChunks(uploadId: string): Promise<ChunkRow[]> {
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const result = await db.query<ChunkRow>(
      `SELECT staging_key, byte_size, sha256 FROM moc_private.storage_upload_chunks
       WHERE upload_id = $1 ORDER BY chunk_index`, [uploadId],
    )
    return result.rows
  })
}

async function saveMultipartId(job: FinalizeJob, uploadId: string): Promise<void> {
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const result = await db.query(
      `UPDATE moc_private.storage_finalize_jobs SET multipart_upload_id = $3, updated_at = now()
       WHERE id = $1 AND lease_token = $2`, [job.jobId, job.leaseToken, uploadId],
    )
    if (!result.rowCount) throw new Error("upload_lease_lost")
  })
}

async function savePart(job: FinalizeJob, part: { PartNumber: number; ETag: string }): Promise<void> {
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    await db.query(
      `UPDATE moc_private.storage_finalize_jobs
       SET completed_parts = completed_parts || $3::jsonb, lease_until = now() + interval '2 minutes', updated_at = now()
       WHERE id = $1 AND lease_token = $2
         AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(completed_parts) p WHERE (p->>'PartNumber')::int = $4)`,
      [job.jobId, job.leaseToken, JSON.stringify([part]), part.PartNumber],
    )
  })
}

async function finishJob(job: FinalizeJob, finalHash: string): Promise<void> {
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const lease = await db.query(
      `SELECT id FROM moc_private.storage_finalize_jobs
       WHERE id = $1 AND state = 'processing' AND lease_token = $2 FOR UPDATE`, [job.jobId, job.leaseToken],
    )
    if (!lease.rowCount) throw new Error("upload_lease_lost")
    await db.query(
      `INSERT INTO moc_private.storage_objects
         (bucket, object_path, owner_user_id, workspace_id, purpose, byte_size, content_type, sha256, upload_id)
         SELECT bucket, object_path, owner_user_id, workspace_id, purpose, expected_size, content_type, $2, id
         FROM moc_private.storage_uploads WHERE id = $1
         ON CONFLICT (bucket, object_path) DO UPDATE
         SET byte_size = EXCLUDED.byte_size, content_type = EXCLUDED.content_type, sha256 = EXCLUDED.sha256`,
      [job.uploadId, finalHash],
    )
    await db.query(
      `UPDATE moc_private.storage_uploads SET status = 'complete', completed_sha256 = $2,
         completed_at = now(), updated_at = now(), error_code = NULL WHERE id = $1`, [job.uploadId, finalHash],
    )
    await db.query(
      `UPDATE moc_private.storage_finalize_jobs SET state = 'complete', completed_at = now(),
         multipart_upload_id = NULL, lease_token = NULL, lease_until = NULL, updated_at = now()
       WHERE id = $1 AND lease_token = $2`,
      [job.jobId, job.leaseToken],
    )
  })
}

async function recordFailure(job: FinalizeJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "storage_upload_failed"
  const code = /^[a-z0-9_-]{1,48}$/i.test(message) ? message : "storage_upload_failed"
  await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    await db.query(
      `WITH updated AS (
         UPDATE moc_private.storage_finalize_jobs SET
         state = CASE WHEN attempt >= 8 THEN 'failed' ELSE 'queued' END,
         next_attempt_at = now() + make_interval(secs => LEAST(3600, 15 * power(2, LEAST(attempt, 8))::int)),
         lease_token = NULL, lease_until = NULL, last_error_code = $3, updated_at = now()
         WHERE id = $1 AND lease_token = $2 RETURNING upload_id, state
       )
       UPDATE moc_private.storage_uploads upload
       SET status = CASE WHEN updated.state = 'failed' THEN 'failed' ELSE 'queued' END,
           error_code = $3, updated_at = now()
       FROM updated WHERE upload.id = updated.upload_id AND upload.status = 'processing'`,
      [job.jobId, job.leaseToken, code],
    )
  })
}

async function processJob(job: FinalizeJob): Promise<void> {
  let existing = null
  try {
    existing = await headStorageObject(job.bucket, job.objectPath)
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    if (status !== 404) throw error
  }
  if (existing?.ContentLength === job.expectedSize) {
    const chunks = await readChunks(job.uploadId)
    const hash = await hashChunks(job, chunks, async () => undefined)
    const stored = await hashStorageObject(job.bucket, job.objectPath)
    if (stored.size !== job.expectedSize || stored.sha256 !== hash || (job.expectedHash && job.expectedHash !== hash)) {
      throw new Error("integrity_mismatch")
    }
    await finishJob(job, hash)
    return
  }
  if (existing) throw new Error("size_mismatch")

  const chunks = await readChunks(job.uploadId)
  if (!chunks.length) throw new Error("incomplete_upload")
  const uploadId = job.multipartUploadId ?? await startMultipart(job.bucket, job.objectPath, job.contentType)
  if (!job.multipartUploadId) await saveMultipartId(job, uploadId)
  const completed = new Map(job.completedParts.map((part) => [part.PartNumber, part.ETag]))
  const hash = await hashChunks(job, chunks, async (partNumber, partBytes) => {
    const etag = completed.get(partNumber)
    if (etag) return
    const newEtag = await putMultipartPart(job.bucket, job.objectPath, uploadId, partNumber, partBytes)
    completed.set(partNumber, newEtag)
    await savePart(job, { PartNumber: partNumber, ETag: newEtag })
  })
  if (job.expectedHash && job.expectedHash !== hash) {
    await abortMultipart(job.bucket, job.objectPath, uploadId).catch(() => undefined)
    throw new Error("integrity_mismatch")
  }
  const parts = [...completed].sort(([a], [b]) => a - b).map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
  await completeMultipart(job.bucket, job.objectPath, uploadId, parts)
  const stored = await headStorageObject(job.bucket, job.objectPath)
  if (stored.ContentLength !== job.expectedSize) throw new Error("size_mismatch")
  await finishJob(job, hash)
}

async function hashChunks(
  job: FinalizeJob,
  chunks: ChunkRow[],
  uploadPart: (partNumber: number, bytes: Uint8Array) => Promise<void>,
): Promise<string> {
  const hash = createHash("sha256")
  const partBuffer = Buffer.allocUnsafe(ASSEMBLY_PART_SIZE)
  let partLength = 0
  let partNumber = 1
  let totalLength = 0

  async function flushPart(): Promise<void> {
    if (!partLength) return
    await uploadPart(partNumber, partBuffer.subarray(0, partLength))
    partNumber += 1
    partLength = 0
  }

  for (const chunk of chunks) {
    const body = await readStagingObject(job.bucket, chunk.staging_key.slice(job.bucket.length + 1))
    if (body.byteLength !== chunk.byte_size || createHash("sha256").update(body).digest("hex") !== chunk.sha256) {
      throw new Error("chunk_integrity_mismatch")
    }
    totalLength += body.byteLength
    hash.update(body)
    let offset = 0
    while (offset < body.byteLength) {
      const take = Math.min(ASSEMBLY_PART_SIZE - partLength, body.byteLength - offset)
      partBuffer.set(body.subarray(offset, offset + take), partLength)
      offset += take
      partLength += take
      if (partLength === ASSEMBLY_PART_SIZE) await flushPart()
    }
  }
  if (totalLength !== job.expectedSize) throw new Error("size_mismatch")
  await flushPart()
  return hash.digest("hex")
}

export async function processUploadJobs(batchSize = 1): Promise<{ processed: number; failed: number }> {
  let processed = 0
  let failed = 0
  for (let index = 0; index < Math.max(1, Math.min(batchSize, 4)); index += 1) {
    const job = await claimJob()
    if (!job) break
    try {
      await processJob(job)
      const chunks = await readChunks(job.uploadId)
      await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
        await db.query(`DELETE FROM moc_private.storage_upload_chunks WHERE upload_id = $1`, [job.uploadId])
      })
      for (const bucket of new Set(chunks.map((chunk) => chunk.staging_key.split("/", 1)[0]))) {
        if (!bucket) continue
        const objects = chunks.filter((chunk) => chunk.staging_key.startsWith(`${bucket}/`)).map((chunk) => ({ Key: chunk.staging_key.slice(bucket.length + 1) }))
        if (objects.length) await getStorageClient().send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }))
      }
      processed += 1
    } catch (error) {
      await recordFailure(job, error)
      failed += 1
    }
  }
  return { processed, failed }
}

export async function cleanupExpiredUploads(batchSize = 100): Promise<number> {
  const uploads = await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const result = await db.query<{ id: string; bucket: string; object_path: string; multipart_upload_id: string | null }>(
      `WITH expired AS (
         SELECT upload.id FROM moc_private.storage_uploads upload
         LEFT JOIN moc_private.storage_finalize_jobs job ON job.upload_id = upload.id
         WHERE (upload.status IN ('uploading', 'queued', 'failed') AND upload.expires_at < now())
            OR (upload.status = 'aborted' AND (
              job.multipart_upload_id IS NOT NULL OR EXISTS (
                SELECT 1 FROM moc_private.storage_upload_chunks chunk WHERE chunk.upload_id = upload.id
              )
            ))
         ORDER BY upload.expires_at FOR UPDATE OF upload SKIP LOCKED LIMIT $1
       )
       UPDATE moc_private.storage_uploads upload
       SET status = 'aborted', updated_at = now()
       FROM expired WHERE upload.id = expired.id
       RETURNING upload.id, upload.bucket, upload.object_path,
         (SELECT job.multipart_upload_id FROM moc_private.storage_finalize_jobs job WHERE job.upload_id = upload.id) AS multipart_upload_id`, [batchSize],
    )
    return result.rows
  })
  for (const upload of uploads) {
    const chunks = await readChunks(upload.id)
    await new S3UploadObjectStore().deleteStaging(chunks.map((chunk) => chunk.staging_key))
    if (upload.multipart_upload_id) await abortMultipart(upload.bucket, upload.object_path, upload.multipart_upload_id).catch(() => undefined)
    await new S3UploadObjectStore().deleteObject(upload.bucket, upload.object_path).catch(() => undefined)
    await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
      await db.query(`DELETE FROM moc_private.storage_upload_chunks WHERE upload_id = $1`, [upload.id])
      await db.query(`UPDATE moc_private.storage_finalize_jobs SET state = 'aborted', multipart_upload_id = NULL WHERE upload_id = $1`, [upload.id])
    })
  }
  return uploads.length
}

export async function cleanupOrphanStagingObjects(): Promise<number> {
  const cutoff = Date.now() - 60 * 60 * 1000
  let deleted = 0
  for (const bucket of ["avatars", "media", "broadcast-media"]) {
    let continuationToken: string | undefined
    do {
      const page = await listStagingObjects(bucket, continuationToken)
      const candidates = (page.Contents ?? []).filter((item) => item.Key && item.LastModified && item.LastModified.getTime() < cutoff)
      const keys = candidates.map((item) => item.Key!)
      if (keys.length) {
        const active = await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
          const result = await db.query<{ staging_key: string }>(
            `SELECT staging_key FROM moc_private.storage_upload_chunks WHERE staging_key = ANY($1::text[])`, [keys],
          )
          return new Set(result.rows.map((row) => row.staging_key))
        })
        const orphanKeys = keys.filter((key) => !active.has(`${bucket}/${key}`))
        if (orphanKeys.length) {
          await deleteStorageObjects(bucket, orphanKeys)
          deleted += orphanKeys.length
        }
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (continuationToken)
  }
  return deleted
}

export async function cleanupOrphanMultipartUploads(): Promise<number> {
  const cutoff = Date.now() - 60 * 60 * 1000
  let aborted = 0
  for (const bucket of ["avatars", "media", "broadcast-media"]) {
    let keyMarker: string | undefined
    let uploadIdMarker: string | undefined
    do {
      const page = await listManagedMultipartUploads(bucket, keyMarker, uploadIdMarker)
      const candidates = (page.Uploads ?? []).filter((upload) => upload.Key && upload.UploadId && upload.Initiated && upload.Initiated.getTime() < cutoff)
      const uploadIds = candidates.map((upload) => upload.UploadId!)
      if (uploadIds.length) {
        const tracked = await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
          const result = await db.query<{ object_path: string; multipart_upload_id: string }>(
            `SELECT upload.object_path, job.multipart_upload_id
             FROM moc_private.storage_finalize_jobs job
             JOIN moc_private.storage_uploads upload ON upload.id = job.upload_id
             WHERE upload.bucket = $1 AND job.multipart_upload_id = ANY($2::text[])`, [bucket, uploadIds],
          )
          return new Set(result.rows.map((row) => `${row.object_path}#${row.multipart_upload_id}`))
        })
        for (const upload of candidates) {
          if (upload.Key && upload.UploadId && !tracked.has(`${upload.Key}#${upload.UploadId}`)) {
            await abortMultipart(bucket, upload.Key, upload.UploadId).catch(() => undefined)
            aborted += 1
          }
        }
      }
      keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined
      uploadIdMarker = page.IsTruncated ? page.NextUploadIdMarker : undefined
    } while (keyMarker && uploadIdMarker)
  }
  return aborted
}
