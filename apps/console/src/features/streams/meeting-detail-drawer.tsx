import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Key,
  Maximize2,
  MessageCircle,
  Mic,
  Pencil,
  Repeat,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
import { useMeetingDetailDrawer } from "./use-meeting-detail-drawer"

type MeetingDetailPanelProps = {
  meeting: ZoomMeeting
  onClose: () => void
  onEdit?: (meeting: ZoomMeeting) => void
  onDelete?: (meeting: ZoomMeeting) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`
}

export function MeetingDetailPanel({ meeting, onClose, onEdit, onDelete }: MeetingDetailPanelProps) {
  const drawer = useMeetingDetailDrawer(meeting, onClose, onEdit, onDelete)

  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false

  return (
    <>
          <SplitPanel.Header className="flex items-center gap-1">
            <Button.Icon aria-label="Close meeting" variant="ghost" icon={<X />} onClick={drawer.actions.close} />
            <Button.Icon aria-label="Open full page" variant="ghost" icon={<Maximize2 />} onClick={drawer.actions.openFullPage} />
            <div className="flex-1" />
            {drawer.meta.canEdit && (
              <Button.Icon aria-label="Edit meeting" variant="ghost" icon={<Pencil />} onClick={drawer.actions.edit} />
            )}
            {drawer.meta.canDelete && (
              <Button.Icon aria-label="Delete meeting" variant="ghost" icon={<Trash2 />} onClick={drawer.actions.remove} />
            )}
          </SplitPanel.Header>

          <SplitPanel.Content className="py-4">
            <div className="px-4 pb-4">
              <Title.h6>{meeting.topic}</Title.h6>
              {meeting.description && (
                <Paragraph.sm className="text-tertiary mt-1">{meeting.description}</Paragraph.sm>
              )}
            </div>

            <div className="px-4 space-y-3">
              <MetaRow icon={<Calendar />} label="Start">
                <Paragraph.xs>{formatUtcIsoInTimezone(meeting.startTime, meeting.timezone)}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Clock />} label="Duration">
                <Paragraph.xs>{formatDuration(meeting.duration)}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Globe />} label="Timezone">
                <Paragraph.xs>{meeting.timezone}</Paragraph.xs>
              </MetaRow>

              {meeting.recurrenceType !== "none" && (
                <MetaRow icon={<Repeat />} label="Recurrence">
                  <Badge label={zoomRecurrenceLabel[meeting.recurrenceType]} color="blue" />
                </MetaRow>
              )}

              <MetaRow icon={<Badge label={isPast ? "Past" : "Upcoming"} color={isPast ? "gray" : "green"} />} label="Status">
                <Paragraph.xs>{isPast ? "This meeting has passed" : "Upcoming"}</Paragraph.xs>
              </MetaRow>
            </div>

            <Divider className="my-6" />

            <div className="px-4 space-y-3">
              <Label.md>Settings</Label.md>

              <MetaRow icon={<ShieldCheck />} label="Waiting room">
                <Paragraph.xs>{meeting.waitingRoom ? "Enabled" : "Disabled"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Mic />} label="Mute on entry">
                <Paragraph.xs>{meeting.muteOnEntry ? "On" : "Off"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<MessageCircle />} label="Continuous chat">
                <Paragraph.xs>{meeting.continuousChat ? "Enabled" : "Disabled"}</Paragraph.xs>
              </MetaRow>
            </div>

            {meeting.joinUrl && (
              <>
                <Divider className="my-6" />
                <div className="px-4 space-y-3">
                  <Label.md>Join link</Label.md>
                  <div className="flex items-center gap-2">
                    <Paragraph.xs className="text-tertiary truncate flex-1">
                      {meeting.joinUrl}
                    </Paragraph.xs>
                    <Button.Icon
                      aria-label="Copy join link"
                      variant="ghost"
                      icon={drawer.state.copiedField === "join" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={drawer.actions.copyJoinUrl}
                    />
                    <Button.IconLink render={<a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open join link" variant="ghost" icon={<ExternalLink />} />
                  </div>
                </div>
              </>
            )}

            {meeting.password && (
              <>
                <Divider className="my-6" />
                <div className="px-4 space-y-3">
                  <MetaRow icon={<Key />} label="Passcode">
                    <div className="flex items-center gap-1">
                      <Paragraph.xs className="font-mono">{meeting.password}</Paragraph.xs>
                      <Button.Icon
                        aria-label="Copy passcode"
                        variant="ghost"
                        icon={drawer.state.copiedField === "pass" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={drawer.actions.copyPassword}
                      />
                    </div>
                  </MetaRow>
                </div>
              </>
            )}
          </SplitPanel.Content>
    </>
  )
}
