import type { MediaType } from "./media-type"

export type MediaItem = {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnail: string | null
  duration: number | null // intrinsic source seconds; null for images or when not yet probed
  width: number | null // intrinsic pixel width; null for audio or when not yet probed
  height: number | null // intrinsic pixel height; null for audio or when not yet probed
  createdAt: string
}
