import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { RequestLinkField } from "@/features/request-links/request-link-field"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Section } from "@moc/ui/components/display/section"
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
  Link2,
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
import { StreamProviderIcon } from "./stream-provider-icon"

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
        <Button.Icon aria-label="Close meeting" variant="ghost" size="sm" icon={<X />} onClick={drawer.actions.close} />
        <Button.Icon aria-label="Open full page" variant="ghost" size="sm" icon={<Maximize2 />} onClick={drawer.actions.openFullPage} />
        <div className="flex-1" />
        {drawer.meta.canEdit && (
          <Button.Icon aria-label="Edit meeting" variant="ghost" size="sm" icon={<Pencil />} onClick={drawer.actions.edit} />
        )}
        {drawer.meta.canDelete && (
          <Button.Icon aria-label="Delete meeting" variant="danger-secondary" size="sm" icon={<Trash2 />} onClick={drawer.actions.remove} />
        )}
      </SplitPanel.Header>

      <SplitPanel.Content>
        <div className="flex items-start gap-4 landscape:flex-col">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-secondary bg-secondary text-quaternary">
            <StreamProviderIcon provider="zoom" decorative className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label.md className="truncate">{meeting.topic}</Label.md>
            <Badge dot label={isPast ? "Past" : "Upcoming"} color={isPast ? "gray" : "green"} />
            <Paragraph.sm className="text-tertiary">{meeting.timezone}</Paragraph.sm>
            <Paragraph.sm className="text-tertiary">{formatUtcIsoInTimezone(meeting.startTime, meeting.timezone)}</Paragraph.sm>
          </div>
        </div>

        <RequestLinkField kind="meeting" id={meeting.id} />

        <Section>
          <Section.Header title="Details" size="sm" />
          <Section.Body className="gap-3">
            <MetaRow icon={<Calendar />} label="Start">
              <Paragraph.sm>{formatUtcIsoInTimezone(meeting.startTime, meeting.timezone)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Clock />} label="Duration">
              <Paragraph.sm>{formatDuration(meeting.duration)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Globe />} label="Timezone">
              <Paragraph.sm>{meeting.timezone}</Paragraph.sm>
            </MetaRow>

            {meeting.recurrenceType !== "none" && (
              <MetaRow icon={<Repeat />} label="Recurrence">
                <Badge label={zoomRecurrenceLabel[meeting.recurrenceType]} color="blue" />
              </MetaRow>
            )}

            <MetaRow icon={<ShieldCheck />} label="Waiting room">
              <Paragraph.sm>{meeting.waitingRoom ? "Enabled" : "Disabled"}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Mic />} label="Mute on entry">
              <Paragraph.sm>{meeting.muteOnEntry ? "On" : "Off"}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<MessageCircle />} label="Continuous chat">
              <Paragraph.sm>{meeting.continuousChat ? "Enabled" : "Disabled"}</Paragraph.sm>
            </MetaRow>
          </Section.Body>
        </Section>

        {(meeting.joinUrl || meeting.password) && (
          <Section>
            <Section.Header title="Links & setup" size="sm" />
            <Section.Body className="gap-3">
              {meeting.joinUrl && (
                <MetaRow icon={<Link2 />} label="Join link">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="min-w-0 flex-1 truncate text-tertiary">{meeting.joinUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy join link"
                      variant="ghost"
                      size="sm"
                      icon={drawer.state.copiedField === "join" ? <Check className="text-success" /> : <Copy />}
                      onClick={drawer.actions.copyJoinUrl}
                    />
                    <Button.IconLink render={<a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open join link" variant="ghost" size="sm" icon={<ExternalLink />} />
                  </div>
                </MetaRow>
              )}

              {meeting.password && (
                <MetaRow icon={<Key />} label="Passcode">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="font-mono">{meeting.password}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy passcode"
                      variant="ghost"
                      size="sm"
                      icon={drawer.state.copiedField === "pass" ? <Check className="text-success" /> : <Copy />}
                      onClick={drawer.actions.copyPassword}
                    />
                  </div>
                </MetaRow>
              )}
            </Section.Body>
          </Section>
        )}
        <ItemDiscussionPanel kind="meeting" itemId={meeting.id} />
      </SplitPanel.Content>
    </>
  )
}
