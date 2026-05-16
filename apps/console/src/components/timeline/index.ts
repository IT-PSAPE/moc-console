// Cue-sheet timeline — a thin domain layer composing the @moc/ui Timeline
// primitive (see ADR-0003). The public API is unchanged for existing
// consumers (events detail page, public share page, cue modal).
export { Timeline, useTimeline, type TimelinePlaybackSync } from './cue-sheet-timeline'
export { CUE_TYPE_CONFIG, TRACK_COLORS } from './timeline-types'
export type { CueModalState, CueFormData, CueFilter } from './timeline-types'
export type { PlaybackSyncRole } from './use-playback-sync'
