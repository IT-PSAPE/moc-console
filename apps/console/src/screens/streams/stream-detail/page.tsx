import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { useDetailReturn } from "@/hooks/use-detail-return"
import { RequestLinkField } from "@/features/request-links/request-link-field"
import { Link, useParams } from "react-router-dom"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Section } from "@moc/ui/components/display/section"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { StreamModal } from "@/features/streams/stream-modal"
import { useStreamDetail } from "@/features/streams/use-stream-detail"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel, latencyPreferenceLabel } from "@moc/types/streams/stream-constants"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Page } from "@moc/ui/components/layout/page"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"
import { routes } from "@/screens/console-routes"
import { Calendar, Check, Code, Copy, ExternalLink, Eye, Gauge, Key, Link2, ListVideo, Monitor, Pencil, Play, Radio, Square, Tag, Trash2 } from "lucide-react"

function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamDetailScreen() {
  const back = useDetailReturn(`/${routes.streams}`, "Back to streams")
  const { id } = useParams<{ id: string }>()
  const { state, actions, meta } = useStreamDetail(id)
  const { stream, error, isLoading, editOpen, deleteOpen, isDeleting, localDeleteOpen, isRemovingLocal, copiedField, copyMessage } = state

  useBreadcrumbOverride(id ?? "", stream?.title)
  useBreadcrumbOverride("stream", "Stream")

  function handleOpenEdit() {
    actions.setEditOpen(true)
  }

  function handleOpenDelete() {
    actions.setDeleteOpen(true)
  }

  function handleOpenLocalDelete() {
    actions.setLocalDeleteOpen(true)
  }

  if (isLoading) return <Page.Loading />;

  if (error) {
    return <Page><Page.Content width="standard"><ResourceLoadError title="Could not load stream" error={error} onRetry={actions.retry} /></Page.Content></Page>
  }

  if (!stream) {
    return (
      <Page><Page.Content width="standard">
        <EmptyState headingLevel="h1" icon={<Radio />} title="Stream not found" description="The stream you're looking for doesn't exist." />
      </Page.Content></Page>
    )
  }

  const showLinksSection = Boolean(stream.streamUrl) || (meta.canViewStreamKey && Boolean(stream.streamKey))

  return (
    <DetailPage>
      <DetailPage.Back render={<Link to={back.href} />}>{back.label}</DetailPage.Back>
      <Paragraph.xs role="status" aria-live="polite" className="sr-only">{copyMessage}</Paragraph.xs>
      <TopBarActions>
        {meta.canEdit && (
          <Button variant="ghost" icon={<Pencil />} onClick={handleOpenEdit}>Edit</Button>
        )}
        {meta.canDelete && (
          <Button.Icon aria-label="Delete stream" variant="danger-secondary" icon={<Trash2 />} onClick={handleOpenDelete} />
        )}
        {meta.canCleanupLocal && (
          <Button variant="secondary" onClick={handleOpenLocalDelete}>Remove local record</Button>
        )}
      </TopBarActions>

      <DetailPage.Header className="pt-8">
        <div className="flex w-full items-start gap-4 landscape:flex-col">
          {stream.thumbnailUrl && (
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              width="224"
              height="126"
              className="w-56 aspect-video shrink-0 rounded-lg border border-secondary object-cover landscape:w-full landscape:max-w-xs"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Page.Title className="truncate">{stream.title}</Page.Title>
            <Badge dot label={streamStatusLabel[stream.streamStatus]} color={streamStatusColor[stream.streamStatus]} />
            <Paragraph.sm className="text-tertiary">{streamPrivacyLabel[stream.privacyStatus]}</Paragraph.sm>
            <Paragraph.sm className="text-tertiary">{formatDateTime(stream.scheduledStartTime)}</Paragraph.sm>
          </div>
        </div>
      </DetailPage.Header>

      <DetailPage.Section><RequestLinkField kind="stream" id={stream.id} /></DetailPage.Section>

      <DetailPage.Divider />
      <DetailPage.Section>
        <Section.Header title="Details" size="sm" />
        <div className="space-y-3">
          <MetaRow icon={<Calendar />} label="Scheduled">
            <Paragraph.sm>{formatDateTime(stream.scheduledStartTime)}</Paragraph.sm>
          </MetaRow>

          {stream.actualStartTime && (
            <MetaRow icon={<Calendar />} label="Started">
              <Paragraph.sm>{formatDateTime(stream.actualStartTime)}</Paragraph.sm>
            </MetaRow>
          )}

          {stream.actualEndTime && (
            <MetaRow icon={<Calendar />} label="Ended">
              <Paragraph.sm>{formatDateTime(stream.actualEndTime)}</Paragraph.sm>
            </MetaRow>
          )}

          {stream.isForKids && (
            <MetaRow icon={<Eye />} label="Audience">
              <Paragraph.sm>Made for kids</Paragraph.sm>
            </MetaRow>
          )}

          <MetaRow icon={<Gauge />} label="Latency">
            <Paragraph.sm>{latencyPreferenceLabel[stream.latencyPreference]}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Monitor />} label="DVR">
            <Paragraph.sm>{stream.enableDvr ? "Enabled" : "Disabled"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Code />} label="Embedding">
            <Paragraph.sm>{stream.enableEmbed ? "Allowed" : "Disabled"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Play />} label="Auto-start">
            <Paragraph.sm>{stream.enableAutoStart ? "On" : "Off"}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Square />} label="Auto-stop">
            <Paragraph.sm>{stream.enableAutoStop ? "On" : "Off"}</Paragraph.sm>
          </MetaRow>

          {stream.tags.length > 0 && (
            <MetaRow icon={<Tag />} label="Tags">
              <div className="flex flex-wrap gap-1">
                {stream.tags.map((tag) => (
                  <Badge key={tag} label={tag} />
                ))}
              </div>
            </MetaRow>
          )}

          {stream.playlistId && (
            <MetaRow icon={<ListVideo />} label="Playlist">
              <Paragraph.sm className="truncate">{stream.playlistId}</Paragraph.sm>
            </MetaRow>
          )}
        </div>
      </DetailPage.Section>

      {showLinksSection && (
        <>
          <DetailPage.Divider />
          <DetailPage.Section>
            <Section.Header title="Links & setup" size="sm" />
            <div className="space-y-3">
              {stream.streamUrl && (
                <MetaRow icon={<Link2 />} label="YouTube link">
                  <div className="flex items-center gap-1 min-w-0">
                    <Paragraph.sm className="text-tertiary truncate flex-1">{stream.streamUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy stream link"
                      variant="ghost"
                      size="sm"
                      icon={copiedField === "url" ? <Check className="text-success" /> : <Copy />}
                      onClick={actions.copyStreamUrl}
                    />
                    <Button.IconLink render={<a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" />} aria-label="Open stream link" variant="ghost" size="sm" icon={<ExternalLink />} />
                  </div>
                </MetaRow>
              )}

              {meta.canViewStreamKey && stream.streamKey && (
                <MetaRow icon={<Key />} label="Stream key">
                  <div className="flex items-center gap-1 min-w-0">
                    <Paragraph.sm className="font-mono truncate">{stream.streamKey}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy stream key"
                      variant="ghost"
                      size="sm"
                      icon={copiedField === "key" ? <Check className="text-success" /> : <Copy />}
                      onClick={actions.copyStreamKey}
                    />
                  </div>
                </MetaRow>
              )}

              {meta.canViewStreamKey && stream.ingestionUrl && (
                <MetaRow icon={<ExternalLink />} label="Server URL">
                  <div className="flex items-center gap-1 min-w-0">
                    <Paragraph.sm className="font-mono truncate">{stream.ingestionUrl}</Paragraph.sm>
                    <Button.Icon
                      aria-label="Copy server URL"
                      variant="ghost"
                      size="sm"
                      icon={copiedField === "ingestion" ? <Check className="text-success" /> : <Copy />}
                      onClick={actions.copyIngestionUrl}
                    />
                  </div>
                </MetaRow>
              )}
            </div>
          </DetailPage.Section>
        </>
      )}

      <DetailPage.Divider />
      <DetailPage.Section><ItemDiscussionPanel kind="stream" itemId={stream.id} /></DetailPage.Section>

      <StreamModal
        open={editOpen}
        onOpenChange={actions.setEditOpen}
        onSubmit={actions.update}
        stream={stream}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={actions.setDeleteOpen}
        title="Delete stream?"
        description="This also removes the broadcast from YouTube. This action cannot be undone."
        confirmLabel="Delete stream"
        isConfirming={isDeleting}
        onConfirm={actions.remove}
      />
      <ConfirmationDialog
        open={localDeleteOpen}
        onOpenChange={actions.setLocalDeleteOpen}
        title="Remove local stream record?"
        description="This removes only the MOC Console record. The YouTube broadcast will remain in YouTube."
        confirmLabel="Remove local record"
        isConfirming={isRemovingLocal}
        onConfirm={actions.removeLocal}
      />
    </DetailPage>
  )
}
