import type { MediaType } from "./media-type"

export type Cue = {
  id: string
  mediaItemId: string
  mediaItemName: string
  mediaItemType: MediaType
  order: number
  durationOverride: number | null // seconds, null = use media default
  disabled?: boolean // skip this cue during playout
}
