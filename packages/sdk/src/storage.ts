import { MocApiError } from "./error"
import type { MocTransport } from "./transport"
import { uploadStorageFile } from "./storage-upload"
import type { StorageBucket, StorageRemoveInput, StorageUploadInput, StorageUploadPurpose, StorageUploadResult, StorageUrlInput } from "./storage-types"
export type { StorageBucket, StorageProgress, StorageRemoveInput, StorageUploadInput, StorageUploadPurpose, StorageUploadResult, StorageUrlInput } from "./storage-types"

const MAX_RANGE_BYTES = 4 * 1024 * 1024

function bucketForPurpose(purpose: StorageUploadPurpose): StorageBucket {
  if (purpose === "avatar") return "avatars"
  if (purpose === "stream-thumbnail" || purpose === "quote-image") return "media"
  return "broadcast-media"
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
  function upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    return uploadStorageFile(transport, input)
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
