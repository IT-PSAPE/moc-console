import { MocApiError } from "./error"
import type { StorageUploadInput, StorageUploadResult } from "./storage-types"
import type { MocTransport } from "./transport"

type UploadCreated = StorageUploadResult & { id: string; chunkSize: number; expectedChunks: number }
type UploadState = { id: string; status: "uploading" | "queued" | "processing" | "complete" | "aborted" | "failed"; errorCode: string | null; result: StorageUploadResult | null }

const FINALIZE_POLL_START_MS = 400
const FINALIZE_POLL_MAX_MS = 5_000
// Applies after all bytes are sent, leaving large/slow transfers unrestricted.
// Multiple renewed two-minute worker leases can finish within this window.
const FINALIZE_TIMEOUT_MS = 15 * 60_000

function fileName(file: Blob): string {
  const namedFile = file as Blob & { name?: string }
  return namedFile.name?.trim() || "upload.bin"
}

function waitForPoll(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    function finish(): void {
      signal.removeEventListener("abort", abort)
      resolve()
    }
    function abort(): void {
      clearTimeout(timer)
      signal.removeEventListener("abort", abort)
      reject(signal.reason)
    }
    const timer = setTimeout(finish, ms)
    signal.addEventListener("abort", abort, { once: true })
  })
}

async function finalizeUpload(transport: MocTransport, id: string, input: StorageUploadInput): Promise<StorageUploadResult> {
  const controller = new AbortController()
  function abort(): void { controller.abort(input.signal?.reason) }
  input.signal?.throwIfAborted()
  input.signal?.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(() => controller.abort(new MocApiError(
    "Upload processing is taking too long. It may still finish; please try again later.",
    { status: 408, code: "upload_processing_timeout", details: { uploadId: id } },
  )), FINALIZE_TIMEOUT_MS)
  const options = { workspaceId: input.workspaceId, signal: controller.signal }
  const path = `/api/storage/uploads/${encodeURIComponent(id)}`
  try {
    await transport.request(`${path}/finalize`, { ...options, method: "POST", json: {} })
    let delay = FINALIZE_POLL_START_MS
    while (true) {
      controller.signal.throwIfAborted()
      const state = await transport.request<UploadState>(path, options)
      controller.signal.throwIfAborted()
      if (state.status === "complete" && state.result) return state.result
      if (state.status === "failed" || state.status === "aborted") {
        throw new MocApiError("Upload could not be completed", { status: 500, code: state.errorCode ?? state.status })
      }
      await waitForPoll(delay, controller.signal)
      delay = Math.min(FINALIZE_POLL_MAX_MS, delay * 1.5)
    }
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason
    throw error
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener("abort", abort)
  }
}

export async function uploadStorageFile(transport: MocTransport, input: StorageUploadInput): Promise<StorageUploadResult> {
  input.signal?.throwIfAborted()
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
    signal: input.signal,
  })
  for (let index = 0; index < created.expectedChunks; index += 1) {
    input.signal?.throwIfAborted()
    const start = index * created.chunkSize
    const end = Math.min(start + created.chunkSize, input.file.size)
    await transport.request(`/api/storage/uploads/${encodeURIComponent(created.id)}/chunks/${index}`, {
      method: "PUT",
      body: input.file.slice(start, end),
      headers: { "Content-Type": contentType },
      workspaceId: input.workspaceId,
      signal: input.signal,
    })
    input.signal?.throwIfAborted()
    input.onProgress?.({ loaded: end, total: input.file.size })
  }
  return finalizeUpload(transport, created.id, input)
}
