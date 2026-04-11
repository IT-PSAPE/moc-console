import type { MediaItem } from "@/types/broadcast/media-item"
import type { MediaType } from "@/types/broadcast/media-type"

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

export function getDefaultMediaDetails(type: MediaType): Pick<MediaItem, "duration" | "thumbnail"> {
  return {
    duration: type === "image" ? null : 0,
    thumbnail: null,
  }
}
