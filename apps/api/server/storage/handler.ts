import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { PoolClient, QueryResultRow } from "pg"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getStorageClient, getStorageObject, headStorageObject } from "@moc/backend/storage/s3"
import { MAX_CHUNK_SIZE, makeUploadUrl, type StorageBucket, type UploadPurpose } from "@moc/backend/storage/upload-protocol"
import { resolveMediaResponse } from "@moc/backend/storage/media-response"
import { PostgresUploadRepository } from "@moc/backend/storage/postgres-upload-repository"
import { S3UploadObjectStore } from "@moc/backend/storage/s3"
import { StorageUploadService, UploadServiceError, type UploadManifest } from "@moc/backend/storage/upload-service"
import { withActor } from "@moc/backend/database"
import { AuthError, requireAuthenticatedUser } from "../auth-guard.js"
import { applyCors, isAllowedOrigin } from "../cors.js"
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse } from "../http.js"
import { canReadStorageObject } from "./read-access.js"

type BinaryRequest = ApiRequest & AsyncIterable<Uint8Array | string>
type StreamingResponse = ApiResponse & {
  statusCode: number
  write: (chunk: Uint8Array) => boolean
  once: (event: "drain", listener: () => void) => unknown
  end: (body?: unknown) => void
}

type Json = Record<string, unknown>
export type StorageMediaReader = Pick<typeof import("@moc/backend/storage/s3"), "getStorageObject" | "headStorageObject">

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BUCKETS = new Set<StorageBucket>(["avatars", "media", "broadcast-media"])

function writeJson(response: ApiResponse, status: number, body: unknown): void {
  response.setHeader("Content-Type", "application/json; charset=utf-8")
  response.status(status).json(body)
}

function errorResponse(response: ApiResponse, error: unknown): void {
  if (error instanceof UploadServiceError) {
    writeJson(response, error.status, { error: { code: error.code, message: error.message }, requestId: randomUUID() })
    return
  }
  if (error instanceof ApiStorageError) {
    writeJson(response, error.status, { error: { code: error.code, message: error.message }, requestId: randomUUID() })
    return
  }
  writeJson(response, 500, { error: { code: "storage_error", message: "Storage request failed" }, requestId: randomUUID() })
}

class ApiStorageError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function parseRoute(request: ApiRequest): string[] {
  const pathname = new URL(request.url ?? "/api/storage", "http://moc.local").pathname
  const raw = pathname.replace(/^\/api\/storage\/?/, "")
  if (!raw) return []
  return raw.split("/").map((part) => decodeURIComponent(part))
}

async function readJson(request: BinaryRequest, limit = 64 * 1024): Promise<Json> {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body as Json
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > limit) throw new ApiStorageError("payload_too_large", "Request body is too large", 413)
    chunks.push(buffer)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"))
    if (!isJsonObject(parsed)) throw new Error("invalid_json")
    return parsed
  } catch {
    throw new ApiStorageError("invalid_input", "Invalid JSON request body", 400)
  }
}

function isJsonObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringField(value: Json, name: string): string {
  const field = value[name]
  if (typeof field !== "string") throw new ApiStorageError("invalid_input", `Invalid ${name}`, 400)
  return field
}

function optionalString(value: Json, name: string): string | null {
  const field = value[name]
  if (field === undefined || field === null) return null
  if (typeof field !== "string") throw new ApiStorageError("invalid_input", `Invalid ${name}`, 400)
  return field
}

async function withUploadContext<T>(userId: string, workspaceId: string | null, work: (db: PoolClient) => Promise<T>): Promise<T> {
  return withActor({ userId, workspaceId, role: "moc_app" }, work)
}

async function assertWorkspacePermission(db: PoolClient, userId: string, workspaceId: string, permission: "can_create" | "can_delete"): Promise<void> {
  const result = await db.query<{ allowed: boolean } & QueryResultRow>(
    `SELECT EXISTS (
       SELECT 1 FROM public.workspace_users wu JOIN public.roles r ON r.id = wu.role_id
       WHERE wu.user_id = $1 AND wu.workspace_id = $2 AND r.${permission} = true
     ) AS allowed`, [userId, workspaceId],
  )
  if (!result.rows[0]?.allowed) throw new ApiStorageError("forbidden", "Workspace permission required", 403)
}

function expectedWorkspace(request: ApiRequest, bodyWorkspaceId: string | null): string | null {
  if (!bodyWorkspaceId) return null
  if (!UUID.test(bodyWorkspaceId)) throw new ApiStorageError("invalid_input", "Invalid workspaceId", 400)
  const selected = headerValue(request.headers, "x-moc-workspace")
  if (selected !== bodyWorkspaceId) throw new ApiStorageError("forbidden", "Workspace context does not match the upload", 403)
  return bodyWorkspaceId
}

function publicManifest(manifest: UploadManifest) {
  return {
    id: manifest.id,
    bucket: manifest.bucket,
    path: manifest.objectPath,
    url: makeUploadUrl(manifest.bucket, manifest.objectPath),
    size: manifest.size,
    contentType: manifest.contentType,
    chunkSize: MAX_CHUNK_SIZE,
    expectedChunks: manifest.expectedChunks,
  }
}

async function createUpload(request: BinaryRequest, response: ApiResponse, userId: string): Promise<void> {
  const input = await readJson(request)
  const purpose = stringField(input, "purpose") as UploadPurpose
  const workspaceId = expectedWorkspace(request, optionalString(input, "workspaceId"))
  const size = input.size
  if (typeof size !== "number" || !Number.isSafeInteger(size)) throw new ApiStorageError("invalid_input", "Invalid size", 400)
  const contentType = stringField(input, "contentType")
  const fileName = stringField(input, "fileName")
  if (purpose !== "avatar" && !workspaceId) throw new ApiStorageError("invalid_input", "Workspace is required", 400)
  const result = await withUploadContext(userId, workspaceId, async (db) => {
    if (workspaceId) await assertWorkspacePermission(db, userId, workspaceId, "can_create")
    const service = new StorageUploadService(new PostgresUploadRepository(db), new S3UploadObjectStore())
    return service.create({ ownerUserId: userId, workspaceId, purpose, size, contentType, fileName })
  })
  writeJson(response, 201, publicManifest(result))
}

async function readChunk(request: BinaryRequest, maximum = MAX_CHUNK_SIZE): Promise<Uint8Array> {
  const contentLength = Number(headerValue(request.headers, "content-length"))
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > maximum) {
    throw new ApiStorageError("payload_too_large", "Invalid upload chunk size", 413)
  }
  const parts: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk)
    total += buffer.byteLength
    if (total > maximum) throw new ApiStorageError("payload_too_large", "Upload chunk exceeds the 4 MiB limit", 413)
    parts.push(buffer)
  }
  if (total !== contentLength) throw new ApiStorageError("invalid_input", "Upload chunk length does not match Content-Length", 400)
  return Buffer.concat(parts, total)
}

async function handleUploadSession(request: BinaryRequest, response: ApiResponse, userId: string, segments: string[]): Promise<void> {
  const id = segments[1]
  if (!id || !UUID.test(id)) throw new ApiStorageError("not_found", "Upload session not found", 404)
  const dbWorkspace = await withUploadContext(userId, null, async (db) => {
    const result = await db.query<{ workspace_id: string | null } & QueryResultRow>(
      `SELECT workspace_id FROM moc_private.storage_uploads WHERE id = $1 AND owner_user_id = $2`, [id, userId],
    )
    return result.rows[0]?.workspace_id ?? null
  })
  await withUploadContext(userId, dbWorkspace, async (db) => {
    const service = new StorageUploadService(new PostgresUploadRepository(db), new S3UploadObjectStore())
    if (segments[2] === "chunks" && segments.length === 4 && request.method === "PUT") {
      const index = Number(segments[3])
      if (!Number.isSafeInteger(index) || index < 0) throw new ApiStorageError("invalid_input", "Invalid chunk index", 400)
      const body = await readChunk(request)
      const contentType = headerValue(request.headers, "content-type") ?? ""
      const result = await service.putChunk(userId, id, index, body, contentType)
      writeJson(response, 200, result)
      return
    }
    if (segments.length === 3 && request.method === "POST" && segments[2] === "finalize") {
      const result = await service.finalize(userId, id)
      writeJson(response, 202, result)
      return
    }
    if (segments.length === 2 && request.method === "GET") {
      const result = await service.status(userId, id)
      writeJson(response, 200, {
        id: result.id,
        status: result.status,
        errorCode: result.errorCode,
        result: result.result,
      })
      return
    }
    if (segments.length === 2 && request.method === "DELETE") {
      const result = await service.abort(userId, id)
      writeJson(response, 200, result)
      return
    }
    throw new ApiStorageError("not_found", "Storage operation not found", 404)
  })
}

async function removeObjects(request: BinaryRequest, response: ApiResponse, userId: string, bucket: string): Promise<void> {
  if (!BUCKETS.has(bucket as StorageBucket)) throw new ApiStorageError("invalid_input", "Unsupported storage bucket", 400)
  const input = await readJson(request)
  const purpose = stringField(input, "purpose")
  const workspaceId = expectedWorkspace(request, optionalString(input, "workspaceId"))
  const paths = input.paths
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 100 || paths.some((path) => typeof path !== "string" || path.length > 512)) {
    throw new ApiStorageError("invalid_input", "Invalid storage paths", 400)
  }
  await withUploadContext(userId, workspaceId, async (db) => {
    if (workspaceId) await assertWorkspacePermission(db, userId, workspaceId, "can_delete")
    const records = await db.query<{ object_path: string; purpose: string; byte_size: number } & QueryResultRow>(
      `SELECT object_path, purpose, byte_size FROM moc_private.storage_objects
       WHERE bucket = $1 AND object_path = ANY($2::text[]) AND owner_user_id = $3
         AND purpose = $4 AND workspace_id IS NOT DISTINCT FROM $5`,
      [bucket, paths, userId, purpose, workspaceId],
    )
    if (records.rows.length !== paths.length) throw new ApiStorageError("not_found", "Storage object not found", 404)
    for (const record of records.rows) await getStorageClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: record.object_path }))
    await db.query(
      `DELETE FROM moc_private.storage_objects WHERE bucket = $1 AND object_path = ANY($2::text[]) AND owner_user_id = $3`,
      [bucket, paths, userId],
    )
  })
  writeJson(response, 200, { removed: paths.length })
}

async function authorizeObjectRead(bucket: StorageBucket, path: string, viewerUserId: string | null, viewerWorkspaceId: string | null): Promise<{ contentType: string; size: number; sha256: string; publicBroadcastItem: boolean }> {
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (db) => {
    const result = await db.query<{
      content_type: string
      byte_size: string | number
      sha256: string
      owner_user_id: string
      workspace_id: string | null
      public_broadcast_item: boolean
      shares_profile_workspace: boolean
      is_workspace_member: boolean
    } & QueryResultRow>(
      `SELECT object.content_type, object.byte_size, object.sha256, object.owner_user_id, object.workspace_id,
         EXISTS (SELECT 1 FROM public.broadcast_items item
                 WHERE item.storage_bucket = object.bucket AND item.storage_path = object.object_path) AS public_broadcast_item,
         EXISTS (SELECT 1 FROM public.workspace_users actor
                 JOIN public.workspace_users profile ON profile.workspace_id = actor.workspace_id
                 WHERE actor.user_id = $3 AND profile.user_id = object.owner_user_id
                   AND ($4::uuid IS NULL OR actor.workspace_id = $4::uuid)) AS shares_profile_workspace,
         EXISTS (SELECT 1 FROM public.workspace_users member
                 WHERE member.user_id = $3 AND member.workspace_id = object.workspace_id
                   AND ($4::uuid IS NULL OR member.workspace_id = $4::uuid)) AS is_workspace_member
       FROM moc_private.storage_objects object
       WHERE object.bucket = $1 AND object.object_path = $2`,
      [bucket, path, viewerUserId, viewerWorkspaceId],
    )
    const object = result.rows[0]
    if (!object || !canReadStorageObject({
      bucket,
      ownerUserId: object.owner_user_id,
      workspaceId: object.workspace_id,
      viewerUserId,
      sharesProfileWorkspace: object.shares_profile_workspace,
      isWorkspaceMember: object.is_workspace_member,
      linkedToBroadcastItem: object.public_broadcast_item,
    })) throw new ApiStorageError("not_found", "Storage object not found", 404)
    return {
      contentType: object.content_type,
      size: Number(object.byte_size),
      sha256: object.sha256,
      publicBroadcastItem: object.public_broadcast_item,
    }
  })
}

async function readObject(request: ApiRequest, response: StreamingResponse, bucketText: string, path: string, headOnly: boolean, mediaReader: StorageMediaReader): Promise<void> {
  if (!BUCKETS.has(bucketText as StorageBucket)) throw new ApiStorageError("not_found", "Storage object not found", 404)
  const bucket = bucketText as StorageBucket
  let viewerUserId: string | null = null
  try {
    viewerUserId = (await requireAuthenticatedUser(normaliseHeaders(request.headers))).userId
  } catch (error) {
    if (!(error instanceof AuthError)) throw error
  }
  const workspaceHeader = headerValue(request.headers, "x-moc-workspace")
  const viewerWorkspaceId = workspaceHeader && UUID.test(workspaceHeader) ? workspaceHeader : null
  const metadata = await authorizeObjectRead(bucket, path, viewerUserId, viewerWorkspaceId)
  const head = await mediaReader.headStorageObject(bucket, path)
  const etag = head.ETag ? `"${head.ETag.replaceAll('"', "")}"` : `"${metadata.sha256}"`
  const modified = head.LastModified
  response.setHeader("Accept-Ranges", "bytes")
  response.setHeader("ETag", etag)
  response.setHeader("Content-Type", metadata.contentType)
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.setHeader("Cache-Control", metadata.publicBroadcastItem ? "public, max-age=3600" : "private, no-store")
  if (modified) response.setHeader("Last-Modified", modified.toUTCString())

  const plan = resolveMediaResponse({
    method: headOnly ? "HEAD" : "GET",
    size: metadata.size,
    etag,
    lastModified: modified ?? null,
    ifNoneMatch: headerValue(request.headers, "if-none-match"),
    ifModifiedSince: headerValue(request.headers, "if-modified-since"),
    range: headerValue(request.headers, "range"),
    ifRange: headerValue(request.headers, "if-range"),
  })
  if (plan.status === 304 || plan.status === 416) {
    if (plan.contentRange) response.setHeader("Content-Range", plan.contentRange)
    response.setHeader("Content-Length", String(plan.contentLength))
    response.statusCode = plan.status
    response.end()
    return
  }
  if (headOnly) {
    response.setHeader("Content-Length", String(plan.contentLength))
    if (plan.contentRange) response.setHeader("Content-Range", plan.contentRange)
    response.statusCode = plan.status
    response.end()
    return
  }

  const rangeHeader = plan.range ? `bytes=${plan.range.start}-${plan.range.end}` : undefined
  const result = await mediaReader.getStorageObject(bucket, path, rangeHeader)
  response.setHeader("Content-Length", String(result.ContentLength ?? plan.contentLength))
  if (plan.contentRange) response.setHeader("Content-Range", plan.contentRange)
  response.statusCode = plan.status
  if (!result.Body) throw new ApiStorageError("storage_unavailable", "Storage object body is unavailable", 503)
  await pipeline(Readable.from(result.Body as AsyncIterable<Uint8Array>), response as never)
}

export async function handleStorageRequest(request: BinaryRequest, response: StreamingResponse, mediaReader: StorageMediaReader = { getStorageObject, headStorageObject }): Promise<void> {
  if (applyCors(request, response)) return
  try {
    if (["POST", "PUT", "DELETE"].includes(request.method ?? "") && !isAllowedOrigin(headerValue(request.headers, "origin"))) {
      writeJson(response, 403, { error: { code: "forbidden_origin", message: "Forbidden origin" }, requestId: randomUUID() })
      return
    }
    const segments = parseRoute(request)
    if (segments[0] === "uploads" && segments.length === 1 && request.method === "POST") {
      const user = await requireAuthenticatedUser(normaliseHeaders(request.headers))
      await createUpload(request, response, user.userId)
      return
    }
    if (segments[0] === "uploads" && segments.length >= 2) {
      const user = await requireAuthenticatedUser(normaliseHeaders(request.headers))
      await handleUploadSession(request, response, user.userId, segments)
      return
    }
    if (segments[0] === "objects" && segments.length === 2 && request.method === "DELETE") {
      const user = await requireAuthenticatedUser(normaliseHeaders(request.headers))
      await removeObjects(request, response, user.userId, segments[1] ?? "")
      return
    }
    if (segments.length >= 2 && (request.method === "GET" || request.method === "HEAD")) {
      await readObject(request, response, segments[0] ?? "", segments.slice(1).join("/"), request.method === "HEAD", mediaReader)
      return
    }
    writeJson(response, 404, { error: { code: "not_found", message: "Storage route not found" }, requestId: randomUUID() })
  } catch (error) {
    errorResponse(response, error)
  }
}
