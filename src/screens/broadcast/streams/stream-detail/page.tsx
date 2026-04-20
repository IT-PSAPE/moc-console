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
import { StreamModal } from "@/features/broadcast/stream-modal"
import type { StreamFormData } from "@/features/broadcast/stream-modal"
import { updateStream, deleteStream } from "@/data/mutate-streams"
import { fetchStreamById } from "@/data/fetch-streams"
import { streamStatusColor, streamStatusLabel, streamPrivacyLabel, latencyPreferenceLabel } from "@/types/broadcast/stream-constants"
import type { Stream } from "@/types/broadcast/stream"
import { formatUtcIsoInTimezone } from "@/utils/zoned-date-time"
import { getErrorMessage } from "@/utils/get-error-message"
import { Modal } from "@/components/overlays/modal"
import { Calendar, Check, Code, Copy, ExternalLink, Eye, Gauge, Key, ListVideo, Loader, Monitor, Pencil, Play, Radio, Shield, Square, Tag, Trash2, TriangleAlert} from "lucide-react"

function formatDateTime(iso: string | null): string {
  if (!iso) return "Not set"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const { role } = useAuth()
  const {
    state: { streams },
    actions: { loadStreams, syncStream, removeStream },
  } = useBroadcast()

  const [stream, setStream] = useState<Stream | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => { loadStreams() }, [loadStreams])

  useEffect(() => {
    if (!id) return
    const fromContext = streams.find((s) => s.id === id)
    if (fromContext) {
      setStream(fromContext)
      setIsLoading(false)
      return
    }
    let cancelled = false
    fetchStreamById(id).then((data) => {
      if (!cancelled) {
        setStream(data ?? null)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id, streams])

  useBreadcrumbOverride(id ?? "", stream?.title)
  useBreadcrumbOverride("stream", "Stream")

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const handleUpdate = useCallback(
    async (params: StreamFormData) => {
      if (!stream) return
      try {
        const { thumbnail, ...fields } = params
        const updated = await updateStream({ ...stream, ...fields }, thumbnail)
        syncStream(updated)
        setStream(updated)
        toast({ title: "Stream updated", variant: "success" })
      } catch (error) {
        const message = getErrorMessage(error, "The stream could not be updated.")
        toast({ title: "Failed to update stream", description: message, variant: "error" })
        throw new Error(message)
      }
    },
    [stream, syncStream, toast],
  )

  const handleDelete = useCallback(async () => {
    if (!stream) return
    setIsDeleting(true)
    try {
      await deleteStream(stream)
      removeStream(stream.id)
      toast({ title: "Stream deleted", variant: "success" })
      navigate("/broadcast/streams")
    } catch (error) {
      toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }, [stream, removeStream, toast, navigate])

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    )
  }

  if (!stream) {
    return (
      <section className="mx-auto max-w-content-sm">
        <EmptyState icon={<Radio />} title="Stream not found" description="The stream you're looking for doesn't exist." />
      </section>
    )
  }

  const canEdit = role?.can_update === true
  const canDelete = role?.can_delete === true
  const canViewStreamKey = role?.can_create === true

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

      {stream.thumbnailUrl && (
        <div className="px-4 pt-8">
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full rounded-lg object-cover aspect-video border border-tertiary"
          />
        </div>
      )}

      {/* Header */}
      <Header.Root className="px-4 pt-8">
        <Header.Lead className="gap-2">
            <Title.h5>{stream.title}</Title.h5>
          {stream.description && (
            <Paragraph.sm className="text-tertiary">{stream.description}</Paragraph.sm>
          )}
        </Header.Lead>
      </Header.Root>

      {/* Properties */}
      <div className="p-4">
        <div className="space-y-3">
          <MetaRow icon={<Loader />} label="Status">
            <Badge
              label={streamStatusLabel[stream.streamStatus]}
              color={streamStatusColor[stream.streamStatus]}
            />
          </MetaRow>

          <MetaRow icon={<Shield />} label="Privacy">
            <Paragraph.sm>{streamPrivacyLabel[stream.privacyStatus]}</Paragraph.sm>
          </MetaRow>

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

          {stream.tags.length > 0 && (
            <MetaRow icon={<Tag />} label="Tags">
              <div className="flex flex-wrap gap-1">
                {stream.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary">
                    {tag}
                  </span>
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
      </div>

      {/* Playback */}
      <Divider className="px-4 my-2" />
      <div className="p-4">
        <Label.md className="block pb-3">Playback</Label.md>
        <div className="space-y-3">
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
        </div>
      </div>

      {/* YouTube Link */}
      {stream.streamUrl && (
        <>
          <Divider className="px-4 my-2" />
          <div className="p-4">
            <Label.md className="block pb-3">YouTube Link</Label.md>
            <div className="flex items-center gap-2">
              <Paragraph.sm className="text-tertiary truncate flex-1">{stream.streamUrl}</Paragraph.sm>
              <Button.Icon
                variant="ghost"
                icon={copiedField === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
                onClick={() => handleCopy(stream.streamUrl!, "url")}
              />
              <a href={stream.streamUrl} target="_blank" rel="noopener noreferrer">
                <Button.Icon variant="ghost" icon={<ExternalLink />} />
              </a>
            </div>
          </div>
        </>
      )}

      {/* Stream Setup */}
      {canViewStreamKey && stream.streamKey && (
        <>
          <Divider className="px-4 my-2" />
          <div className="p-4">
            <Label.md className="block pb-3">Stream Setup (OBS / Encoder)</Label.md>
            <div className="space-y-3">
              <MetaRow icon={<Key />} label="Stream Key">
                <div className="flex items-center gap-1 min-w-0">
                  <Paragraph.sm className="font-mono truncate">{stream.streamKey}</Paragraph.sm>
                  <Button.Icon
                    variant="ghost"
                    icon={copiedField === "key" ? <Check className="text-utility-green-700" /> : <Copy />}
                    onClick={() => handleCopy(stream.streamKey!, "key")}
                  />
                </div>
              </MetaRow>

              {stream.ingestionUrl && (
                <MetaRow icon={<ExternalLink />} label="Server URL">
                  <div className="flex items-center gap-1 min-w-0">
                    <Paragraph.sm className="font-mono truncate">{stream.ingestionUrl}</Paragraph.sm>
                    <Button.Icon
                      variant="ghost"
                      icon={copiedField === "ingestion" ? <Check className="text-utility-green-700" /> : <Copy />}
                      onClick={() => handleCopy(stream.ingestionUrl!, "ingestion")}
                    />
                  </div>
                </MetaRow>
              )}
            </div>
          </div>
        </>
      )}

      <StreamModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        stream={stream}
      />

      <Modal.Root open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false) }}>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.Panel>
              <Modal.Header>
                <Label.md>Delete Stream</Label.md>
              </Modal.Header>
              <Modal.Content className="p-4 flex-row gap-4">
                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                <Paragraph.sm className="text-secondary">
                  Are you sure you want to delete this stream? This will also remove the broadcast from YouTube. This action cannot be undone.
                </Paragraph.sm>
              </Modal.Content>
              <Modal.Footer className="justify-end">
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Stream"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal.Root>
    </section>
  )
}
