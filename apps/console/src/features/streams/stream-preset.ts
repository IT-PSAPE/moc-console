import type { StreamPreset } from "@moc/types/streams/stream"

/** Limits presets to supported fields even when the form contains other actions. */
export function createStreamPreset(fields: Omit<StreamPreset, "thumbnailUrl">, thumbnailUrl: string | null): StreamPreset {
  return {
    title: fields.title,
    description: fields.description,
    scheduledStartTime: fields.scheduledStartTime,
    thumbnailUrl,
    privacyStatus: fields.privacyStatus,
    isForKids: fields.isForKids,
    categoryId: fields.categoryId,
    tags: fields.tags,
    latencyPreference: fields.latencyPreference,
    enableDvr: fields.enableDvr,
    enableEmbed: fields.enableEmbed,
    enableAutoStart: fields.enableAutoStart,
    enableAutoStop: fields.enableAutoStop,
    playlistId: fields.playlistId,
  }
}
