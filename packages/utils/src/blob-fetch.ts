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
export const UNFETCHABLE_THUMBNAIL_MESSAGE =
  "We couldn't load an image from this link, so it can't be used as a thumbnail. Try a different link, or upload the image file directly."

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

// Fully resolves an image URL to its bytes. Thumbnails are images (small), so
// reading the whole blob is fine here — unlike the probe above which guards
// against arbitrary large media. Throws on any failure so the caller can
// surface UNFETCHABLE_THUMBNAIL_MESSAGE and block.
export async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Image URL responded ${res.status}`)
  }
  return res.blob()
}
