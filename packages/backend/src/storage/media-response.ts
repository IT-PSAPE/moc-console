import { parseSingleByteRange, type ByteRange } from "./upload-protocol.js"

export type MediaResponseInput = {
  method: "GET" | "HEAD"
  size: number
  etag: string
  lastModified: Date | null
  ifNoneMatch: string | null
  ifModifiedSince: string | null
  range: string | null
  ifRange: string | null
}

export type MediaResponsePlan = {
  status: 200 | 206 | 304 | 416
  range: ByteRange | null
  contentRange: string | null
  contentLength: number
}

function matchesIfNoneMatch(header: string, etag: string): boolean {
  const normalizedEtag = etag.replace(/^W\//, "")
  return header.split(",").some((candidate) => {
    const value = candidate.trim()
    return value === "*" || value.replace(/^W\//, "") === normalizedEtag
  })
}

function isNotModified(input: MediaResponseInput): boolean {
  if (input.ifNoneMatch) return matchesIfNoneMatch(input.ifNoneMatch, input.etag)
  if (!input.lastModified || !input.ifModifiedSince) return false
  const date = Date.parse(input.ifModifiedSince)
  return Number.isFinite(date) && Math.floor(input.lastModified.getTime() / 1000) <= Math.floor(date / 1000)
}

function shouldHonorRange(input: MediaResponseInput): boolean {
  if (!input.range || !input.ifRange) return true
  if (input.ifRange.startsWith('"') && !input.ifRange.startsWith('W/')) return input.ifRange === input.etag
  const date = Date.parse(input.ifRange)
  const modified = input.lastModified
  return Number.isFinite(date) && modified !== null
    && Math.floor(modified.getTime() / 1000) <= Math.floor(date / 1000)
}

export function resolveMediaResponse(input: MediaResponseInput): MediaResponsePlan {
  if (isNotModified(input)) return { status: 304, range: null, contentRange: null, contentLength: 0 }
  const range = shouldHonorRange(input) ? parseSingleByteRange(input.range, input.size) : null
  if (range && "unsatisfiable" in range) {
    return { status: 416, range: null, contentRange: `bytes */${input.size}`, contentLength: 0 }
  }
  if (range) {
    return {
      status: 206,
      range,
      contentRange: `bytes ${range.start}-${range.end}/${input.size}`,
      contentLength: range.end - range.start + 1,
    }
  }
  return { status: 200, range: null, contentRange: null, contentLength: input.size }
}
