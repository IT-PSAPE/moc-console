import { TimelineRoot } from './timeline-root'
import { TimelineToolbar } from './timeline-toolbar'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineSidebar } from './timeline-sidebar'

export const Timeline = Object.assign(TimelineRoot, {
    Toolbar: TimelineToolbar,
    Canvas: TimelineCanvas,
    Sidebar: TimelineSidebar,
})

export { useTimeline } from './timeline-context'
export type { TimelineContextValue, TimelinePlaybackSync } from './timeline-context'
export type { PlaybackSyncRole } from './use-playback-sync'
export type { CueModalState, CueFormData, CueFilter } from './timeline-types'
export { CUE_TYPE_CONFIG, TRACK_COLORS } from './timeline-types'
