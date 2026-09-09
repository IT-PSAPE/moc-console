import { parseId3Tag, readId3TagLength, type Id3Tag } from "@/features/id3-tag"
import { cropCoverBlob } from "./crop-cover-blob"

export type BroadcastItemMetadata = {
  artist: string | null
  coverUrl: string | null
  title: string | null
}

const EMPTY_METADATA: BroadcastItemMetadata = { artist: null, coverUrl: null, title: null }
// Enough for the header plus the text frames of a typical tag, so a file with
// no cover art costs exactly one request.
const PROBE_BYTES = 8 * 1024
const MAX_TAG_BYTES = 4 * 1024 * 1024
const cache = new Map<string, Promise<BroadcastItemMetadata>>()

async function fetchRange(url: string, lastByte: number): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { Range: `bytes=0-${lastByte}` } })

  if (!response.ok) return null

  return new Uint8Array(await response.arrayBuffer())
}

async function toMetadata(tag: Id3Tag): Promise<BroadcastItemMetadata> {
  if (!tag.picture) return { artist: tag.artist, coverUrl: null, title: tag.title }

  // A copy is taken because the Blob must not alias the larger tag buffer.
  const cover = new Blob([new Uint8Array(tag.picture.data)], { type: tag.picture.mimeType })

  return { artist: tag.artist, coverUrl: URL.createObjectURL(await cropCoverBlob(cover)), title: tag.title }
}

async function readMetadata(url: string): Promise<BroadcastItemMetadata> {
  try {
    const probe = await fetchRange(url, PROBE_BYTES - 1)

    if (!probe) return EMPTY_METADATA

    const tagLength = readId3TagLength(probe)

    if (tagLength === null) return EMPTY_METADATA
    if (tagLength <= probe.length) return await toMetadata(parseId3Tag(probe))
    if (tagLength > MAX_TAG_BYTES) return await toMetadata(parseId3Tag(probe))

    const fullTag = await fetchRange(url, tagLength - 1)

    return await toMetadata(parseId3Tag(fullTag ?? probe))
  } catch {
    // Metadata is decoration: a blocked or malformed read falls back to the
    // stored item title and a generic cover.
    return EMPTY_METADATA
  }
}

/** Cached per URL, so switching items or re-rendering never refetches a tag. */
export function fetchItemMetadata(url: string): Promise<BroadcastItemMetadata> {
  const cached = cache.get(url)

  if (cached) return cached

  const pending = readMetadata(url)
  cache.set(url, pending)
  return pending
}
