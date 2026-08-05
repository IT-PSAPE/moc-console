import { Link, useParams } from "react-router-dom"
import { Header } from "@moc/ui/components/display/header"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { MeetingModal } from "@/features/streams/meeting-modal"
import { useMeetingDetail } from "@/features/streams/use-meeting-detail"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Page } from "@moc/ui/components/layout/page"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"
import { routes } from "@/screens/console-routes"
import { Calendar, Check, Clock, Copy, ExternalLink, Globe, Key, MessageCircle, Mic, Pencil, Repeat, ShieldCheck, Trash2, Video} from "lucide-react"

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`
}

export function MeetingDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { state, actions, meta } = useMeetingDetail(id)
  const { meeting, error, isLoading, editOpen, deleteOpen, isDeleting, localDeleteOpen, isRemovingLocal, copiedField, copyMessage } = state

  useBreadcrumbOverride(id ?? "", meeting?.topic)
  useBreadcrumbOverride("meeting", "Meeting")

  function handleOpenEdit() {
    actions.setEditOpen(true)
  }

  function handleOpenDelete() {
    actions.setDeleteOpen(true)
  }

  function handleOpenLocalDelete() {
    actions.setLocalDeleteOpen(true)
  }

  if (isLoading) {
    return (
      <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
    )
  }

  if (error) {
    return <Page><Page.Content width="standard"><ResourceLoadError title="Could not load meeting" error={error} onRetry={actions.retry} /></Page.Content></Page>
  }

  if (!meeting) {
    return (
      <Page><Page.Content width="standard">
        <EmptyState headingLevel="h1" icon={<Video />} title="Meeting not found" description="The meeting you're looking for doesn't exist." />
      </Page.Content></Page>
    )
  }

  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false
  return (
    <DetailPage>
      <DetailPage.Back render={<Link to={`/${routes.streams}`} />}>Back to streams</DetailPage.Back>
      <Paragraph.xs role="status" aria-live="polite" className="sr-only">{copyMessage}</Paragraph.xs>
      <TopBarActions>
        {meta.canEdit && (
          <Button variant="secondary" icon={<Pencil />} onClick={handleOpenEdit}>Edit</Button>
        )}
        {meta.canDelete && (
          <Button.Icon aria-label="Delete meeting" variant="danger-secondary" icon={<Trash2 />} onClick={handleOpenDelete} />
        )}
        {meta.canCleanupLocal && (
          <Button variant="secondary" onClick={handleOpenLocalDelete}>Remove local record</Button>
        )}
      </TopBarActions>

      {/* Header */}
      <DetailPage.Header>
        <Header.Lead className="gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Page.Title>{meeting.topic}</Page.Title>
            <Badge label={isPast ? "Past" : "Upcoming"} color={isPast ? "gray" : "green"} />
          </div>
          {meeting.description && (
            <Paragraph.sm className="text-tertiary">{meeting.description}</Paragraph.sm>
          )}
        </Header.Lead>
      </DetailPage.Header>

      {/* Schedule */}
      <DetailPage.Section>
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
      </DetailPage.Section>

      {/* Settings */}
      <DetailPage.Divider />
      <DetailPage.Section>
        <Label.md className="block pb-3">Settings</Label.md>
        <div className="space-y-3">
          <MetaRow icon={<ShieldCheck />} label="Waiting room">
            <Paragraph.sm>{meeting.waitingRoom ? "Enabled" : "Disabled"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Mic />} label="Mute on entry">
            <Paragraph.sm>{meeting.muteOnEntry ? "On" : "Off"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<MessageCircle />} label="Continuous chat">
            <Paragraph.sm>{meeting.continuousChat ? "Enabled" : "Disabled"}</Paragraph.sm>
          </MetaRow>
        </div>
      </DetailPage.Section>

      {/* Join Link */}
      {meeting.joinUrl && (
        <>
          <DetailPage.Divider />
          <DetailPage.Section>
            <Label.md className="block pb-3">Join link</Label.md>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Paragraph.sm className="text-tertiary truncate flex-1">{meeting.joinUrl}</Paragraph.sm>
                <Button.Icon
                  aria-label="Copy join link"
                  variant="ghost"
                  icon={copiedField === "join" ? <Check className="text-utility-green-700" /> : <Copy />}
                  onClick={actions.copyJoinUrl}
                />
                <Button.IconLink render={<a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open join link" variant="ghost" icon={<ExternalLink />} />
              </div>

              {meeting.password && (
                <MetaRow icon={<Key />} label="Passcode">
                  <div className="flex items-center gap-1">
                    <Paragraph.sm className="font-mono">{meeting.password}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy passcode"
                      variant="ghost"
                      icon={copiedField === "pass" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={actions.copyPassword}
                    />
                  </div>
                </MetaRow>
              )}
            </div>
          </DetailPage.Section>
        </>
      )}

      <MeetingModal
        open={editOpen}
        onOpenChange={actions.setEditOpen}
        onSubmit={actions.update}
        meeting={meeting}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={actions.setDeleteOpen}
        title="Delete meeting?"
        description="This also removes the meeting from Zoom. This action cannot be undone."
        confirmLabel="Delete meeting"
        isConfirming={isDeleting}
        onConfirm={actions.remove}
      />
      <ConfirmationDialog
        open={localDeleteOpen}
        onOpenChange={actions.setLocalDeleteOpen}
        title="Remove local meeting record?"
        description="This removes only the MOC Console record. The Zoom meeting will remain in Zoom."
        confirmLabel="Remove local record"
        isConfirming={isRemovingLocal}
        onConfirm={actions.removeLocal}
      />
    </DetailPage>
  )
}
