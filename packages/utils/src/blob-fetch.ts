// Client-side blob reachability for images destined to become YouTube stream
// thumbnails. YouTube has no "set thumbnail by URL" API — we must hold the
// bytes and POST them — and a browser `fetch()` of a cross-origin image is
// CORS-blocked unless the host sends `Access-Control-Allow-Origin`. So an
// image being viewable in an <img> tag does NOT mean we can re-upload it.
// These helpers are the single source of truth for "can we actually get the
// bytes". No server proxy — this stays fully client-side by design.

// Plain-language copy for when an image can't be loaded as bytes. Deliberately
// avoids "fetch"/"blob"/"CORS" — it's shown to non-technical users and is true
// regardless of the underlying cause (CORS, 404, offline, timeout).
export const INVALID_THUMBNAIL_URL_MESSAGE =
  "Use an HTTPS image link, or upload the image file directly."

export const UNFETCHABLE_THUMBNAIL_MESSAGE =
  "We couldn't load an image from this link, so it can't be used as a thumbnail. Try a different link, or upload the image file directly."

// Console selection/preset policy; independent of the provider's upload limit.
export const THUMBNAIL_MAX_SIZE_BYTES = 10 * 1024 * 1024
export const THUMBNAIL_TOO_LARGE_MESSAGE = "Choose an image up to 10 MB."

// Proves an arbitrary URL's bytes are reachable WITHOUT downloading the whole
// resource: start the fetch, read only the first chunk off the response body
// stream, then abort. CORS rejects the fetch before any chunk arrives, so a
// successful first read means both "CORS passed" and "bytes are real" — at
// bounded cost even for a multi-GB file. Resolves false on any failure; never
// throws (used as a non-blocking gate at media-add time).
export async function probeUrlFetchable(url: string): Promise<boolean> {
  const controller = new AbortController()
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok || !res.body) {
      controller.abort()
      return false
    }
    const reader = res.body.getReader()
    await reader.read() // first chunk (or {done:true} for an empty 200) — both prove reachability
    controller.abort()
    return true
  } catch {
    return false
  }
}

// External downloads use HTTPS. Relative same-origin paths also work during
// local development, where the API-owned preset thumbnail URL may use HTTP.
export function imageDownloadUrl(value: string, origin: string | undefined = globalThis.location?.origin): string {
  const input = value.trim()
  try {
    const hasControlCharacter = Array.from(input).some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
    if (!input || input.includes('\\') || hasControlCharacter) throw new TypeError()
    const url = new URL(input, origin)
    const sameOrigin = Boolean(origin && url.origin === origin)
    if (url.username || url.password || (url.protocol !== 'https:' && !(sameOrigin && url.protocol === 'http:'))) {
      throw new TypeError()
    }
    return url.href
  } catch {
    throw new TypeError(INVALID_THUMBNAIL_URL_MESSAGE)
  }
}

// Resolve bytes without forwarding cookies or page URLs to external hosts.
// The caller owns cancellation when a source is removed or its form closes.
export async function fetchImageBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted()
  const res = await fetch(imageDownloadUrl(url), { signal, credentials: 'same-origin', referrerPolicy: 'no-referrer' })
  if (!res.ok) throw new Error(`Image URL responded ${res.status}`)
  if (Number(res.headers.get('Content-Length')) > THUMBNAIL_MAX_SIZE_BYTES) {
    await res.body?.cancel().catch(() => undefined)
    throw new RangeError(THUMBNAIL_TOO_LARGE_MESSAGE)
  }
  const reader = res.body?.getReader()
  const type = res.headers.get('Content-Type') ?? ''
  if (!reader) return new Blob([], { type })
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      signal?.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > THUMBNAIL_MAX_SIZE_BYTES) throw new RangeError(THUMBNAIL_TOO_LARGE_MESSAGE)
      chunks.push(new Uint8Array(value))
    }
    signal?.throwIfAborted()
    return new Blob(chunks, { type })
  } catch (error) {
    await reader.cancel(error).catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}
