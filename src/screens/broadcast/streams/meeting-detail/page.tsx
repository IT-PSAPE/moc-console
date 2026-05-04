import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Header } from "@/components/display/header"
import { Badge } from "@/components/display/badge"
import { Button } from "@/components/controls/button"
import { Divider } from "@/components/display/divider"
import { Label, Paragraph, Title } from "@/components/display/text"
import { MetaRow } from "@/components/display/meta-row"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useBreadcrumbOverride } from "@/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { MeetingModal } from "@/features/broadcast/meeting-modal"
import { updateZoomMeeting, deleteZoomMeeting } from "@/data/mutate-zoom"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { fetchZoomMeetingById } from "@/data/fetch-zoom"
import { zoomRecurrenceLabel } from "@/types/broadcast/zoom-constants"
import type { ZoomMeeting } from "@/types/broadcast/zoom"
import { formatUtcIsoInTimezone } from "@/utils/zoned-date-time"
import { getErrorMessage } from "@/utils/get-error-message"
import { Modal } from "@/components/overlays/modal"
import { Calendar, Check, Clock, Copy, ExternalLink, Globe, Key, MessageCircle, Mic, Pencil, Repeat, ShieldCheck, Trash2, TriangleAlert, Video} from "lucide-react"

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`
}

export function MeetingDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const { role } = useAuth()
  const {
    state: { zoomMeetings },
    actions: { loadZoomMeetings, syncMeeting, removeMeeting },
  } = useBroadcast()

  const [meeting, setMeeting] = useState<ZoomMeeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => { loadZoomMeetings() }, [loadZoomMeetings])

  useEffect(() => {
    if (!id) return
    const fromContext = zoomMeetings.find((m) => m.id === id)
    if (fromContext) {
      setMeeting(fromContext)
      setIsLoading(false)
      return
    }
    let cancelled = false
    fetchZoomMeetingById(id).then((data) => {
      if (!cancelled) {
        setMeeting(data ?? null)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id, zoomMeetings])

  useBreadcrumbOverride(id ?? "", meeting?.topic)
  useBreadcrumbOverride("meeting", "Meeting")

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const handleUpdate = useCallback(
    async (params: CreateMeetingParams) => {
      if (!meeting) return
      try {
        const updated = await updateZoomMeeting({ ...meeting, ...params })
        syncMeeting(updated)
        setMeeting(updated)
        toast({ title: "Meeting updated", variant: "success" })
      } catch (error) {
        const message = getErrorMessage(error, "The meeting could not be updated.")
        toast({ title: "Failed to update meeting", description: message, variant: "error" })
        throw new Error(message)
      }
    },
    [meeting, syncMeeting, toast],
  )

  const handleDelete = useCallback(async () => {
    if (!meeting) return
    setIsDeleting(true)
    try {
      await deleteZoomMeeting(meeting)
      removeMeeting(meeting.id)
      toast({ title: "Meeting deleted", variant: "success" })
      navigate("/broadcast/streams")
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }, [meeting, removeMeeting, toast, navigate])

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    )
  }

  if (!meeting) {
    return (
      <section className="mx-auto max-w-content-sm">
        <EmptyState icon={<Video />} title="Meeting not found" description="The meeting you're looking for doesn't exist." />
      </section>
    )
  }

  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false
  const canEdit = role?.can_update === true
  const canDelete = role?.can_delete === true

  return (
    <section className="mx-auto max-w-content-sm">
      <TopBarActions>
        {canEdit && (
          <Button variant="secondary" icon={<Pencil />} onClick={() => setEditOpen(true)}>Edit</Button>
        )}
        {canDelete && (
          <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
        )}
      </TopBarActions>

      {/* Header */}
      <Header className="px-4 pt-12">
        <Header.Lead className="gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Title.h5>{meeting.topic}</Title.h5>
            <Badge label={isPast ? "Past" : "Upcoming"} color={isPast ? "gray" : "green"} />
          </div>
          {meeting.description && (
            <Paragraph.sm className="text-tertiary">{meeting.description}</Paragraph.sm>
          )}
        </Header.Lead>
      </Header>

      {/* Schedule */}
      <div className="p-4">
        <div className="space-y-3">
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
        </div>
      </div>

      {/* Settings */}
      <Divider className="px-4 my-2" />
      <div className="p-4">
        <Label.md className="block pb-3">Settings</Label.md>
        <div className="space-y-3">
          <MetaRow icon={<ShieldCheck />} label="Waiting Room">
            <Paragraph.sm>{meeting.waitingRoom ? "Enabled" : "Disabled"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Mic />} label="Mute on Entry">
            <Paragraph.sm>{meeting.muteOnEntry ? "On" : "Off"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<MessageCircle />} label="Continuous Chat">
            <Paragraph.sm>{meeting.continuousChat ? "Enabled" : "Disabled"}</Paragraph.sm>
          </MetaRow>
        </div>
      </div>

      {/* Join Link */}
      {meeting.joinUrl && (
        <>
          <Divider className="px-4 my-2" />
          <div className="p-4">
            <Label.md className="block pb-3">Join Link</Label.md>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Paragraph.sm className="text-tertiary truncate flex-1">{meeting.joinUrl}</Paragraph.sm>
                <Button.Icon
                  variant="ghost"
                  icon={copiedField === "join" ? <Check className="text-utility-green-700" /> : <Copy />}
                  onClick={() => handleCopy(meeting.joinUrl!, "join")}
                />
                <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">
                  <Button.Icon variant="ghost" icon={<ExternalLink />} />
                </a>
              </div>

              {meeting.password && (
                <MetaRow icon={<Key />} label="Passcode">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="font-mono">{meeting.password}</Paragraph.sm>
                    <Button.Icon
                      variant="ghost"
                      icon={copiedField === "pass" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={() => handleCopy(meeting.password!, "pass")}
                    />
                  </div>
                </MetaRow>
              )}
            </div>
          </div>
        </>
      )}

      <MeetingModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        meeting={meeting}
      />

      <Modal open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false) }}>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.Panel>
              <Modal.Header>
                <Label.md>Delete Meeting</Label.md>
              </Modal.Header>
              <Modal.Content className="p-4 flex-row gap-4">
                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                <Paragraph.sm className="text-secondary">
                  Are you sure you want to delete this meeting? This will also remove it from Zoom. This action cannot be undone.
                </Paragraph.sm>
              </Modal.Content>
              <Modal.Footer className="justify-end">
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Meeting"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal>
    </section>
  )
}
