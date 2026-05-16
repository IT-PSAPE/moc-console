// Back-compat re-export. The cue-sheet's timeline context now lives in
// cue-sheet-timeline.tsx (it composes the @moc/ui primitive — ADR-0003).
export { useTimeline, type TimelinePlaybackSync } from './cue-sheet-timeline'
