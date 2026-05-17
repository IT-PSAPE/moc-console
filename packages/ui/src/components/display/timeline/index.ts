// Domain-agnostic, composable Timeline primitive. See ADR-0003 / ADR-0004.
//
// Presence = rendered; tree order = layout/stack order. No boolean props
// decide rendering. State lives in the provider; child parts read it via
// context (no prop drilling). The time source is an injected Transport.
//
//   <Timeline lanes={lanes} total={duration} transport={t} onChange={...}>
//     <Timeline.Toolbar>
//       <Timeline.Toolbar.PlayToggle /> <Timeline.Toolbar.Clock />
//       <Timeline.Toolbar.ZoomOut />   <Timeline.Toolbar.ZoomIn />
//     </Timeline.Toolbar>
//     <Timeline.Viewport>
//       <Timeline.Sidebar>
//         <Timeline.SidebarHeader>…</Timeline.SidebarHeader>
//         <Timeline.LaneList>
//           {lanes.map(l => (
//             <Timeline.LaneHeader key={l.id} id={l.id}>
//               <Timeline.LaneHeader.DragHandle>⠿</Timeline.LaneHeader.DragHandle>
//               …
//             </Timeline.LaneHeader>
//           ))}
//           <Timeline.AddLane>＋ Add</Timeline.AddLane>
//         </Timeline.LaneList>
//       </Timeline.Sidebar>
//       <Timeline.Canvas>
//         <Timeline.Ruler />
//         {lanes.map(l => (
//           <Timeline.Lane key={l.id} id={l.id} onClickAt={…}>
//             {l.blocks.map(b => (
//               <Timeline.Block key={b.id} id={b.id} start={b.start} duration={b.duration} onClick={…}>
//                 <Timeline.Block.Move />
//                 <Timeline.Block.ResizeStart /> <Timeline.Block.ResizeEnd />
//                 …content…
//               </Timeline.Block>
//             ))}
//           </Timeline.Lane>
//         ))}
//         <Timeline.Playhead />
//         <Timeline.Preview>…domain compositor…</Timeline.Preview>
//       </Timeline.Canvas>
//     </Timeline.Viewport>
//   </Timeline>

import { TimelineRoot, TimelineViewport } from './root'
import { TimelineToolbar } from './toolbar'
import { TimelineCanvas } from './canvas'
import { TimelineRuler } from './ruler'
import { TimelineSidebar, TimelineSidebarHeader, TimelineLaneList } from './sidebar'
import { TimelineLaneHeader } from './lane-header'
import { TimelineLane } from './lane'
import { TimelineBlock } from './block'
import { TimelinePlayhead, TimelinePlayheadMarker } from './playhead'
import { TimelinePreview } from './preview'
import { TimelineAddLane } from './add-lane'

export const Timeline = Object.assign(TimelineRoot, {
    Viewport: TimelineViewport,
    Toolbar: TimelineToolbar,
    Canvas: TimelineCanvas,
    Ruler: TimelineRuler,
    Sidebar: TimelineSidebar,
    SidebarHeader: TimelineSidebarHeader,
    LaneList: TimelineLaneList,
    LaneHeader: TimelineLaneHeader,
    Lane: TimelineLane,
    Block: TimelineBlock,
    Playhead: TimelinePlayhead,
    PlayheadMarker: TimelinePlayheadMarker,
    Preview: TimelinePreview,
    AddLane: TimelineAddLane,
})

export { useTimeline, useLane } from './context'
export type { TimelineContextValue } from './context'
export { useActiveBlocks, type ActiveBlock } from './selectors'
export { createClockTransport, useClockTransport, useTransportSnapshot, createMediaTransport, type ClockTransport, type ClockTransportOptions, type MediaTransport } from './transport'
export {
    formatClock,
    type TimelineLane as TimelineLaneData,
    type TimelineBlock as TimelineBlockData,
    type TimelineTransport,
    type TransportSnapshot,
} from './types'
