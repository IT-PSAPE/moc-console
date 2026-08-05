import { Card } from "@moc/ui/components/display/card"
import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { MeetingListItem } from "./meeting-list-item"
import type { StreamListEntry } from "./stream-list-entry"
import { StreamListItem } from "./stream-list-item"

type StreamsListProps = {
  entries: StreamListEntry[]
  onSelectStream: (stream: Stream) => void
  onSelectMeeting: (meeting: ZoomMeeting) => void
}

export function StreamsList({ entries, onSelectStream, onSelectMeeting }: StreamsListProps) {
  function renderEntry(entry: StreamListEntry) {
    if (entry.provider === "youtube") {
      return <StreamListItem key={entry.id} stream={entry.stream} onSelect={onSelectStream} />
    }
    return <MeetingListItem key={entry.id} meeting={entry.meeting} onSelect={onSelectMeeting} />
  }

  return (
    <Card>
      <Card.Content ghost className="flex flex-col gap-1.5">
        {entries.map(renderEntry)}
      </Card.Content>
    </Card>
  )
}
