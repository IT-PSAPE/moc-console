import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Drawer } from "@/components/overlays/drawer"
import { Button } from "@/components/controls/button"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
import { MetaRow } from "@/components/display/meta-row"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { zoomRecurrenceLabel } from "@/types/broadcast/zoom-constants"
import type { ZoomMeeting } from "@/types/broadcast/zoom"
import { formatUtcIsoInTimezone } from "@/utils/zoned-date-time"
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

type MeetingDetailDrawerProps = {
  meeting: ZoomMeeting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (meeting: ZoomMeeting) => void
  onDelete?: (meeting: ZoomMeeting) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`
}

export function MeetingDetailDrawer({ meeting, open, onOpenChange, onEdit, onDelete }: MeetingDetailDrawerProps) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const canEdit = role?.can_update === true
  const canDelete = role?.can_delete === true

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const handleOpenFullPage = useCallback(() => {
    if (!meeting) return
    onOpenChange(false)
    navigate(`/${routes.broadcastMeetingDetail.replace(":id", meeting.id)}`)
  }, [meeting, navigate, onOpenChange])

  if (!meeting) return null

  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Panel className="!max-w-lg">
          <Drawer.Header className="flex items-center gap-1">
            <Button.Icon variant="ghost" icon={<X />} onClick={() => onOpenChange(false)} />
            <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} />
            <div className="flex-1" />
            {canEdit && (
              <Button.Icon variant="ghost" icon={<Pencil />} onClick={() => onEdit?.(meeting)} />
            )}
            {canDelete && (
              <Button.Icon variant="ghost" icon={<Trash2 />} onClick={() => onDelete?.(meeting)} />
            )}
          </Drawer.Header>

          <Drawer.Content className="py-4">
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

            <Divider className="px-4 py-6" />

            <div className="px-4 space-y-3">
              <Label.md>Settings</Label.md>

              <MetaRow icon={<ShieldCheck />} label="Waiting Room">
                <Paragraph.xs>{meeting.waitingRoom ? "Enabled" : "Disabled"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<Mic />} label="Mute on Entry">
                <Paragraph.xs>{meeting.muteOnEntry ? "On" : "Off"}</Paragraph.xs>
              </MetaRow>

              <MetaRow icon={<MessageCircle />} label="Continuous Chat">
                <Paragraph.xs>{meeting.continuousChat ? "Enabled" : "Disabled"}</Paragraph.xs>
              </MetaRow>
            </div>

            {meeting.joinUrl && (
              <>
                <Divider className="px-4 py-6" />
                <div className="px-4 space-y-3">
                  <Label.md>Join Link</Label.md>
                  <div className="flex items-center gap-2">
                    <Paragraph.xs className="text-tertiary truncate flex-1">
                      {meeting.joinUrl}
                    </Paragraph.xs>
                    <Button.Icon
                      variant="ghost"
                      icon={copiedField === "join" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={() => handleCopy(meeting.joinUrl!, "join")}
                    />
                    <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">
                      <Button.Icon variant="ghost" icon={<ExternalLink />} />
                    </a>
                  </div>
                </div>
              </>
            )}

            {meeting.password && (
              <>
                <Divider className="px-4 py-6" />
                <div className="px-4 space-y-3">
                  <MetaRow icon={<Key />} label="Passcode">
                    <div className="flex items-center gap-1">
                      <Paragraph.xs className="font-mono">{meeting.password}</Paragraph.xs>
                      <Button.Icon
                        variant="ghost"
                        icon={copiedField === "pass" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={() => handleCopy(meeting.password!, "pass")}
                      />
                    </div>
                  </MetaRow>
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
