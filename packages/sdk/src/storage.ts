import { MocApiError } from "./error"
import type { MocTransport } from "./transport"

export type StorageUploadPurpose = "avatar" | "stream-thumbnail" | "broadcast-audio" | "broadcast-video"
export type StorageBucket = "avatars" | "media" | "broadcast-media"
export type StorageUploadResult = { bucket: StorageBucket; path: string; url: string; size: number; contentType: string }
export type StorageProgress = { loaded: number; total: number }

type UploadCreated = StorageUploadResult & { id: string; chunkSize: number; expectedChunks: number }
type UploadState = { id: string; status: "uploading" | "queued" | "processing" | "complete" | "aborted" | "failed"; errorCode: string | null; result: StorageUploadResult | null }

const MAX_RANGE_BYTES = 4 * 1024 * 1024
const FINALIZE_POLL_START_MS = 400
const FINALIZE_POLL_MAX_MS = 5_000

export type StorageUploadInput = {
  purpose: StorageUploadPurpose
  workspaceId?: string
  file: Blob
  onProgress?: (progress: StorageProgress) => void
}

export type StorageRemoveInput = {
  purpose: StorageUploadPurpose
  workspaceId?: string
  paths: string[]
}

export type StorageUrlInput = { bucket: StorageBucket; path: string }

function fileName(file: Blob): string {
  const namedFile = file as Blob & { name?: string }
  return namedFile.name?.trim() || "upload.bin"
}

function bucketForPurpose(purpose: StorageUploadPurpose): StorageBucket {
  if (purpose === "avatar") return "avatars"
  if (purpose === "stream-thumbnail") return "media"
  return "broadcast-media"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function apiObjectUrl(transport: MocTransport, bucket: StorageBucket, path: string): string {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === ".." || part === ".")) {
    throw new TypeError("Invalid storage object path")
  }
  const encoded = path.split("/").map(encodeURIComponent).join("/")
  return transport.url(`/api/storage/${bucket}/${encoded}`)
}

function isOwnApiStorageUrl(transport: MocTransport, candidate: string): boolean {
  try {
    const expected = new URL(transport.url("/api/storage/"), globalThis.location?.origin)
    const actual = new URL(candidate, expected)
    return actual.origin === expected.origin && actual.pathname.startsWith(expected.pathname)
  } catch {
    return candidate.startsWith("/api/storage/")
  }
}

function requestPath(transport: MocTransport, candidate: string): string {
  const base = transport.url("/api/storage/")
  const fallbackOrigin = typeof globalThis.location === "undefined" ? undefined : globalThis.location.origin
  const target = new URL(candidate, base.startsWith("http") ? base : fallbackOrigin)
  return `${target.pathname}${target.search}`
}

async function readApiError(response: Response): Promise<MocApiError> {
  type ErrorEnvelope = { error?: { code?: unknown; message?: unknown }; requestId?: unknown }
  let body: ErrorEnvelope | null = null
  try {
    body = await response.json() as ErrorEnvelope
  } catch {
    body = null
  }
  const code = typeof body?.error?.code === "string" ? body.error.code : "api_error"
  const message = typeof body?.error?.message === "string" ? body.error.message : `Request failed with status ${response.status}`
  const requestId = typeof body?.requestId === "string" ? body.requestId : response.headers.get("X-Request-Id")
  return new MocApiError(message, { status: response.status, code, requestId })
}

export function createStorageClient(transport: MocTransport) {
  async function upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const contentType = input.file.type || "application/octet-stream"
    const created = await transport.request<UploadCreated>("/api/storage/uploads", {
      method: "POST",
      json: {
        purpose: input.purpose,
        workspaceId: input.workspaceId,
        fileName: fileName(input.file),
        size: input.file.size,
        contentType,
      },
      workspaceId: input.workspaceId,
    })
    let loaded = 0
    for (let index = 0; index < created.expectedChunks; index += 1) {
      const start = index * created.chunkSize
      const end = Math.min(start + created.chunkSize, input.file.size)
      const chunk = input.file.slice(start, end)
      await transport.request(`/api/storage/uploads/${encodeURIComponent(created.id)}/chunks/${index}`, {
        method: "PUT",
        body: chunk,
        headers: { "Content-Type": contentType },
        workspaceId: input.workspaceId,
      })
      loaded = end
      input.onProgress?.({ loaded, total: input.file.size })
    }
    await transport.request(`/api/storage/uploads/${encodeURIComponent(created.id)}/finalize`, {
      method: "POST",
      json: {},
      workspaceId: input.workspaceId,
    })
    let delay = FINALIZE_POLL_START_MS
    while (true) {
      const state = await transport.request<UploadState>(`/api/storage/uploads/${encodeURIComponent(created.id)}`, {
        workspaceId: input.workspaceId,
      })
      if (state.status === "complete" && state.result) return state.result
      if (state.status === "failed" || state.status === "aborted") {
        throw new MocApiError("Upload could not be completed", { status: 500, code: state.errorCode ?? state.status })
      }
      await sleep(delay)
      delay = Math.min(FINALIZE_POLL_MAX_MS, delay * 1.5)
    }
  }

  async function remove(input: StorageRemoveInput): Promise<void> {
    const bucket = bucketForPurpose(input.purpose)
    await transport.request(`/api/storage/objects/${bucket}`, {
      method: "DELETE",
      json: { purpose: input.purpose, workspaceId: input.workspaceId, paths: input.paths },
      workspaceId: input.workspaceId,
    })
  }

  function url(input: StorageUrlInput): string {
    return apiObjectUrl(transport, input.bucket, input.path)
  }

  async function readRange(url: string, start: number, end: number): Promise<Uint8Array> {
    if (!isOwnApiStorageUrl(transport, url)) throw new TypeError("Storage reads must use an API-owned media URL")
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end - start + 1 > MAX_RANGE_BYTES) {
      throw new RangeError(`Range must contain between 1 and ${MAX_RANGE_BYTES} bytes`)
    }
    const response = await transport.request<Response>(requestPath(transport, url), {
      method: "GET",
      headers: { Range: `bytes=${start}-${end}` },
      responseType: "response",
    })
    if (!response.ok) throw await readApiError(response)
    if (response.status !== 206) throw new MocApiError("Storage API did not honor the byte range", { status: response.status, code: "invalid_range_response" })
    const contentRange = response.headers.get("Content-Range")
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange ?? "")
    if (!match || Number(match[1]) !== start || Number(match[2]) !== end) {
      throw new MocApiError("Storage API returned a different byte range", { status: response.status, code: "invalid_range_response" })
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength !== end - start + 1) throw new MocApiError("Storage API returned an incomplete byte range", { status: response.status, code: "invalid_range_response" })
    return bytes
  }

  return { upload, remove, url, readRange }
}
