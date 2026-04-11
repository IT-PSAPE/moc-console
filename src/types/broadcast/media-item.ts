import type { MediaType } from "./media-type"

export type MediaItem = {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnail: string | null
  duration: number | null // seconds, null for static images
  createdAt: string
}
