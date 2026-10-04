export const MAX_CHUNK_SIZE = 4 * 1024 * 1024
export const ASSEMBLY_PART_SIZE = 8 * 1024 * 1024
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024

export type StorageBucket = "avatars" | "media" | "broadcast-media"
export type UploadPurpose = "avatar" | "stream-thumbnail" | "broadcast-audio" | "broadcast-video"

export type UploadChunk = { index: number; start: number; endExclusive: number }

export type UploadPolicy =
  | { ok: true; bucket: StorageBucket; maxSize: number; allowedTypes: readonly string[] }
  | { ok: false; reason: string }

const POLICIES: Record<UploadPurpose, Omit<Extract<UploadPolicy, { ok: true }>, "ok">> = {
  avatar: { bucket: "avatars", maxSize: 50 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] },
  "stream-thumbnail": { bucket: "media", maxSize: 10 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png"] },
  "broadcast-audio": { bucket: "broadcast-media", maxSize: MAX_AUDIO_SIZE, allowedTypes: ["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/webm"] },
  "broadcast-video": { bucket: "broadcast-media", maxSize: MAX_VIDEO_SIZE, allowedTypes: ["video/mp4", "video/webm", "video/quicktime"] },
}

const BUCKETS = new Set<StorageBucket>(["avatars", "media", "broadcast-media"])

export function getUploadPolicy(purpose: string, size: number): UploadPolicy {
  if (!Number.isSafeInteger(size) || size <= 0) return { ok: false, reason: "Upload size must be a positive safe integer" }
  const policy = POLICIES[purpose as UploadPurpose]
  if (!policy) return { ok: false, reason: "Unsupported upload purpose" }
  if (size > policy.maxSize) return { ok: false, reason: "Upload exceeds the allowed size" }
  return { ok: true, ...policy }
}

export function planChunks(size: number, chunkSize = MAX_CHUNK_SIZE): UploadChunk[] {
  if (!Number.isSafeInteger(size) || size <= 0) throw new RangeError("Upload size must be a positive safe integer")
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0 || chunkSize > MAX_CHUNK_SIZE) {
    throw new RangeError(`Chunk size must be between 1 and ${MAX_CHUNK_SIZE} bytes`)
  }
  const chunks: UploadChunk[] = []
  for (let start = 0, index = 0; start < size; index += 1) {
    const endExclusive = Math.min(start + chunkSize, size)
    chunks.push({ index, start, endExclusive })
    start = endExclusive
  }
  return chunks
}

export function makeUploadUrl(bucket: string, path: string): string {
  if (!BUCKETS.has(bucket as StorageBucket)) throw new TypeError("Unsupported storage bucket")
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === ".." || part === ".")) {
    throw new TypeError("Invalid storage object path")
  }
  return `/api/storage/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`
}

export type ByteRange = { start: number; end: number }

/** Returns null for no Range header; malformed and unsatisfiable ranges are marked for HTTP 416. */
export function parseSingleByteRange(header: string | null, size: number): ByteRange | { unsatisfiable: true } | null {
  if (header === null) return null
  if (!Number.isSafeInteger(size) || size < 0 || !/^bytes=\d*-\d*$/.test(header.trim())) return { unsatisfiable: true }
  const range = header.trim().slice(6)
  const [rawStart, rawEnd] = range.split("-")
  if (rawStart === "" && rawEnd === "") return { unsatisfiable: true }
  if (size === 0) return { unsatisfiable: true }
  if (rawStart === "") {
    const suffix = Number(rawEnd)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return { unsatisfiable: true }
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(rawStart)
  const end = rawEnd === "" ? size - 1 : Number(rawEnd)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) {
    return { unsatisfiable: true }
  }
  return { start, end: Math.min(end, size - 1) }
}
