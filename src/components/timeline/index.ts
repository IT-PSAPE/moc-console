import { TimelineRoot } from './timeline-root'
import { TimelineToolbar } from './timeline-toolbar'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineSidebar } from './timeline-sidebar'

export const Timeline = {
    Root: TimelineRoot,
    Toolbar: TimelineToolbar,
    Canvas: TimelineCanvas,
    Sidebar: TimelineSidebar,
}

export { useTimeline } from './timeline-context'
export type { TimelineContextValue } from './timeline-context'
export type { CueModalState, CueFormData, CueFilter } from './timeline-types'
export { CUE_TYPE_CONFIG, TRACK_COLORS } from './timeline-types'
