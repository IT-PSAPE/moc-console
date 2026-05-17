import type { MediaItem, MediaType } from "@moc/types/broadcast"

const mediaExtensions: Record<MediaType, readonly string[]> = {
  image: ["avif", "bmp", "gif", "heic", "jpeg", "jpg", "png", "svg", "webp"],
  audio: ["aac", "flac", "m4a", "mp3", "ogg", "wav", "weba"],
  video: ["avi", "m4v", "mov", "mp4", "mpeg", "mpg", "ogv", "webm"],
}

function getMediaTypeFromExtension(value: string): MediaType | null {
  const normalizedValue = value.trim().split("?")[0].split("#")[0]
  const match = normalizedValue.match(/\.([a-z0-9]+)$/i)

  if (!match) return null

  const extension = match[1].toLowerCase()

  if (mediaExtensions.image.includes(extension)) return "image"
  if (mediaExtensions.audio.includes(extension)) return "audio"
  if (mediaExtensions.video.includes(extension)) return "video"

  return null
}

export function inferMediaTypeFromMimeType(mimeType: string): MediaType | null {
  const normalizedType = mimeType.trim().toLowerCase()

  if (!normalizedType) return null
  if (normalizedType.startsWith("image/")) return "image"
  if (normalizedType.startsWith("audio/")) return "audio"
  if (normalizedType.startsWith("video/")) return "video"

  return null
}

export function inferMediaTypeFromFile(file: Pick<File, "name" | "type">): MediaType | null {
  return inferMediaTypeFromMimeType(file.type) ?? getMediaTypeFromExtension(file.name)
}

export function inferMediaTypeFromUrl(url: string): MediaType | null {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) return null

  try {
    return getMediaTypeFromExtension(new URL(trimmedUrl).pathname)
  } catch {
    return getMediaTypeFromExtension(trimmedUrl)
  }
}

export function inferMediaTypeFromSource({ file, url }: { file?: Pick<File, "name" | "type"> | null; url?: string | null }): MediaType | null {
  if (file) return inferMediaTypeFromFile(file)
  if (url) return inferMediaTypeFromUrl(url)
  return null
}

export function getDefaultMediaDetails(): Pick<MediaItem, "duration" | "thumbnail" | "width" | "height"> {
  // Unknown until probed. `duration: null` (not 0) so the resolver can tell
  // "not measured yet" apart from "genuinely zero" and fall back sensibly.
  return {
    duration: null,
    thumbnail: null,
    width: null,
    height: null,
  }
}

export type MediaMetadata = Pick<MediaItem, "duration" | "width" | "height">

// Reads a media file/URL's intrinsic metadata in the browser: video/audio
// duration and pixel dimensions. No server-side ffprobe — this fits the
// fully client-side stack. Resolves with nulls (never rejects) so a probe
// failure degrades gracefully to the playlist default instead of blocking
// an upload or a backfill pass.
export function probeMediaMetadata(
  source: { file?: File | null; url?: string | null },
  type: MediaType,
): Promise<MediaMetadata> {
  const objectUrl = source.file ? URL.createObjectURL(source.file) : null
  const src = objectUrl ?? source.url ?? ""

  const empty: MediaMetadata = { duration: null, width: null, height: null }
  const cleanup = () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  const finite = (n: number) => (Number.isFinite(n) && n > 0 ? n : null)

  if (!src) return Promise.resolve(empty)

  if (type === "image") {
    return new Promise<MediaMetadata>((resolve) => {
      const img = new Image()
      const done = (m: MediaMetadata) => { cleanup(); resolve(m) }
      img.onload = () => done({ duration: null, width: finite(img.naturalWidth), height: finite(img.naturalHeight) })
      img.onerror = () => done(empty)
      img.src = src
    })
  }

  // video / audio
  return new Promise<MediaMetadata>((resolve) => {
    const el = document.createElement("video")
    el.preload = "metadata"
    el.muted = true
    let settled = false
    const done = (m: MediaMetadata) => {
      if (settled) return
      settled = true
      el.removeAttribute("src")
      el.load()
      cleanup()
      resolve(m)
    }
    el.onloadedmetadata = () => {
      done({
        duration: finite(el.duration),
        width: finite(el.videoWidth),
        height: finite(el.videoHeight),
      })
    }
    el.onerror = () => done(empty)
    // Don't hang an upload forever on a slow/blocked source.
    setTimeout(() => done(empty), 15000)
    el.src = src
  })
}
