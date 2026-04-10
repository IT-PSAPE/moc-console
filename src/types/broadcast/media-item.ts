import type { MediaType } from "./media-type"

export type SlideImage = {
  id: string
  url: string
  duration: number // seconds
}

export type MediaItem = {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnail: string | null
  duration: number | null // seconds, null for static images
  createdAt: string
  slides: SlideImage[] | null // slide-specific: ordered images with per-slide durations
  audioUrl: string | null // slide-specific: audio overlay
}
