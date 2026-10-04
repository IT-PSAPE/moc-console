import { createHash, randomUUID } from "node:crypto"
import {
  getUploadPolicy,
  makeUploadUrl,
  planChunks,
  type StorageBucket,
  type UploadPurpose,
} from "./upload-protocol.js"

export type UploadStatus = "uploading" | "queued" | "processing" | "complete" | "aborted" | "failed"

export type UploadManifest = {
  id: string
  ownerUserId: string
  workspaceId: string | null
  purpose: UploadPurpose
  bucket: StorageBucket
  objectPath: string
  stagingPrefix: string
  fileName: string
  size: number
  contentType: string
  expectedChunks: number
  status: UploadStatus
  contentHash: string | null
  errorCode: string | null
}

export type StoredChunk = { index: number; key: string; size: number; sha256: string }

export interface UploadRepository {
  create(manifest: UploadManifest): Promise<void>
  get(id: string): Promise<UploadManifest | null>
  chunksFor(id: string): Promise<StoredChunk[]>
  addChunk(id: string, index: number, chunk: Omit<StoredChunk, "index">): Promise<"created" | "same" | "conflict">
  enqueue(id: string): Promise<void>
  abort(id: string): Promise<void>
}

export interface UploadObjectStore {
  putStaging(key: string, body: Uint8Array, contentType: string): Promise<void>
  deleteStaging(keys: string[]): Promise<void>
  deleteObject(bucket: string, path: string): Promise<void>
}

export type UploadServiceErrorCode =
  | "invalid_upload"
  | "not_found"
  | "conflict"
  | "incomplete_upload"
  | "upload_closed"
  | "storage_unavailable"

export class UploadServiceError extends Error {
  constructor(readonly code: UploadServiceErrorCode, message: string, readonly status: number) {
    super(message)
    this.name = "UploadServiceError"
  }
}

export type CreateUploadInput = {
  ownerUserId: string
  workspaceId?: string | null
  purpose: string
  size: number
  contentType: string
  fileName: string
}

export type UploadResult = { bucket: StorageBucket; path: string; url: string; size: number; contentType: string }

export class StorageUploadService {
  constructor(
    private readonly repository: UploadRepository,
    private readonly objects: UploadObjectStore,
    private readonly newId: () => string = randomUUID,
  ) {}

  async create(input: CreateUploadInput): Promise<UploadManifest> {
    const policy = getUploadPolicy(input.purpose, input.size)
    if (!policy.ok) throw new UploadServiceError("invalid_upload", policy.reason, 400)
    if (!policy.allowedTypes.includes(input.contentType)) {
      throw new UploadServiceError("invalid_upload", "Unsupported content type for upload purpose", 400)
    }
    if (!input.fileName.trim() || input.fileName.length > 180 || input.fileName.includes("/") || input.fileName.includes("\\") ||
      Array.from(input.fileName).some((character) => character.charCodeAt(0) < 32)) {
      throw new UploadServiceError("invalid_upload", "Invalid file name", 400)
    }
    if ((input.purpose === "stream-thumbnail" || input.purpose.startsWith("broadcast-")) && !input.workspaceId) {
      throw new UploadServiceError("invalid_upload", "Workspace is required for this upload purpose", 400)
    }

    const id = this.newId()
    const extension = extensionFor(input.contentType)
    const folder = input.purpose === "avatar"
      ? `${input.ownerUserId}/avatars`
      : `${input.workspaceId}/${input.ownerUserId}/${input.purpose === "stream-thumbnail" ? "stream-thumbnails" : "broadcast-media"}`
    const manifest: UploadManifest = {
      id,
      ownerUserId: input.ownerUserId,
      workspaceId: input.workspaceId ?? null,
      purpose: input.purpose as UploadPurpose,
      bucket: policy.bucket,
      objectPath: `moc-uploads/${folder}/${id}.${extension}`,
      stagingPrefix: `${policy.bucket}/.staging/${id}`,
      fileName: input.fileName.trim(),
      size: input.size,
      contentType: input.contentType,
      expectedChunks: planChunks(input.size).length,
      status: "uploading",
      contentHash: null,
      errorCode: null,
    }
    await this.repository.create(manifest)
    return manifest
  }

  async putChunk(ownerUserId: string, uploadId: string, index: number, body: Uint8Array, contentType: string): Promise<{ duplicate: boolean }> {
    const manifest = await this.getOwned(ownerUserId, uploadId)
    if (manifest.status !== "uploading") throw new UploadServiceError("upload_closed", "Upload session is closed", 409)
    if (contentType !== manifest.contentType) throw new UploadServiceError("invalid_upload", "Chunk content type does not match upload", 400)
    const chunks = planChunks(manifest.size)
    const planned = chunks[index]
    if (!planned || !(body instanceof Uint8Array) || body.byteLength !== planned.endExclusive - planned.start) {
      throw new UploadServiceError("invalid_upload", "Chunk index or size does not match upload manifest", 400)
    }
    const sha256 = createHash("sha256").update(body).digest("hex")
    const key = `${manifest.stagingPrefix}/${String(index).padStart(6, "0")}/${sha256}`
    try {
      await this.objects.putStaging(key, body, contentType)
    } catch {
      throw new UploadServiceError("storage_unavailable", "Could not stage upload chunk", 503)
    }
    let result: "created" | "same" | "conflict"
    try {
      result = await this.repository.addChunk(uploadId, index, { key, size: body.byteLength, sha256 })
    } catch {
      await this.objects.deleteStaging([key]).catch(() => undefined)
      throw new UploadServiceError("upload_closed", "Upload session is closed", 409)
    }
    if (result === "conflict") {
      await this.objects.deleteStaging([key]).catch(() => undefined)
      throw new UploadServiceError("conflict", "Chunk index already contains different bytes", 409)
    }
    return { duplicate: result === "same" }
  }

  async finalize(ownerUserId: string, uploadId: string): Promise<{ status: UploadStatus }> {
    const manifest = await this.getOwned(ownerUserId, uploadId)
    if (manifest.status === "queued" || manifest.status === "processing" || manifest.status === "complete") {
      return { status: manifest.status }
    }
    if (manifest.status !== "uploading") throw new UploadServiceError("upload_closed", "Upload session cannot be finalized", 409)
    const planned = planChunks(manifest.size)
    const chunks = await this.repository.chunksFor(uploadId)
    if (chunks.length !== planned.length) throw new UploadServiceError("incomplete_upload", "Upload is missing chunks", 409)
    for (let index = 0; index < planned.length; index += 1) {
      const chunk = chunks.find((candidate) => candidate.index === index)
      const expected = planned[index]
      if (!chunk || !expected || chunk.size !== expected.endExclusive - expected.start) {
        throw new UploadServiceError("incomplete_upload", "Upload chunk manifest is incomplete", 409)
      }
    }
    await this.repository.enqueue(uploadId)
    return { status: "queued" }
  }

  async status(ownerUserId: string, uploadId: string): Promise<UploadManifest & { result: UploadResult | null }> {
    const manifest = await this.getOwned(ownerUserId, uploadId)
    const result = manifest.status === "complete"
      ? { bucket: manifest.bucket, path: manifest.objectPath, url: makeUploadUrl(manifest.bucket, manifest.objectPath), size: manifest.size, contentType: manifest.contentType }
      : null
    return { ...manifest, result }
  }

  async abort(ownerUserId: string, uploadId: string): Promise<{ status: "aborted" }> {
    const manifest = await this.getOwned(ownerUserId, uploadId)
    if (manifest.status === "complete" || manifest.status === "processing") {
      throw new UploadServiceError("upload_closed", "Upload can no longer be aborted", 409)
    }
    await this.repository.abort(uploadId)
    const chunks = await this.repository.chunksFor(uploadId)
    await this.objects.deleteStaging(chunks.map((chunk) => chunk.key)).catch(() => undefined)
    await this.objects.deleteObject(manifest.bucket, manifest.objectPath).catch(() => undefined)
    return { status: "aborted" }
  }

  private async getOwned(ownerUserId: string, uploadId: string): Promise<UploadManifest> {
    const manifest = await this.repository.get(uploadId)
    if (!manifest || manifest.ownerUserId !== ownerUserId) throw new UploadServiceError("not_found", "Upload session not found", 404)
    return manifest
  }
}

function extensionFor(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/ogg": "ogg", "audio/wav": "wav", "audio/webm": "webm",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  }
  return extensions[contentType] ?? "bin"
}
