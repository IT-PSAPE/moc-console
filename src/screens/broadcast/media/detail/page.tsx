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
import { deleteMediaItem } from "@/data/mutate-broadcast"
import { fetchMediaById } from "@/data/fetch-broadcast"
import { mediaTypeColor, mediaTypeLabel } from "@/types/broadcast/constants"
import type { MediaItem } from "@/types/broadcast/media-item"
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time"
import { getErrorMessage } from "@/utils/get-error-message"
import { Modal } from "@/components/overlays/modal"
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileType,
  Film,
  Play,
  Trash2,
  TriangleAlert,
} from "lucide-react"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`
}

export function MediaDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const { role } = useAuth()
  const {
    state: { media },
    actions: { loadMedia, removeMediaItem },
  } = useBroadcast()

  const [item, setItem] = useState<MediaItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadMedia() }, [loadMedia])

  useEffect(() => {
    if (!id) return
    const fromContext = media.find((m) => m.id === id)
    if (fromContext) {
      setItem(fromContext)
      setIsLoading(false)
      return
    }
    let cancelled = false
    fetchMediaById(id).then((data) => {
      if (!cancelled) {
        setItem(data ?? null)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id, media])

  useBreadcrumbOverride(id ?? "", item?.name)

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!item) return
    setIsDeleting(true)
    try {
      await deleteMediaItem(item)
      removeMediaItem(item.id)
      toast({ title: "Media deleted", variant: "success" })
      navigate("/broadcast/media")
    } catch (error) {
      toast({ title: "Failed to delete media", description: getErrorMessage(error, "The media item could not be deleted."), variant: "error" })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }, [item, removeMediaItem, toast, navigate])

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    )
  }

  if (!item) {
    return (
      <section className="mx-auto max-w-content-md">
        <EmptyState icon={<Film />} title="Media not found" description="The media item you're looking for doesn't exist." />
      </section>
    )
  }

  const canDelete = role?.can_delete === true

  return (
    <section className="mx-auto max-w-content-md">
      <TopBarActions>
        {canDelete && (
          <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
        )}
      </TopBarActions>

      {/* Preview */}
      <div className="px-4 pt-8">
        <div className="w-full rounded-lg bg-secondary_alt border border-tertiary flex items-center justify-center overflow-hidden aspect-video">
          {item.type === "image" && (
            <img src={item.url} alt={item.name} className="size-full object-contain" />
          )}
          {item.type === "video" && (
            <video src={item.url} poster={item.thumbnail ?? undefined} controls playsInline preload="metadata" className="size-full" />
          )}
          {item.type === "audio" && (
            <div className="size-full flex flex-col items-center justify-center gap-4 p-6">
              <div className="size-20 rounded-full bg-primary border border-tertiary flex items-center justify-center">
                <Play className="size-8 text-tertiary" />
              </div>
              <audio src={item.url} controls preload="metadata" className="w-full max-w-xs" />
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <Header className="px-4 pt-8">
        <Header.Lead className="gap-2">
          <Title.h5>{item.name}</Title.h5>
        </Header.Lead>
      </Header>

      {/* Properties */}
      <div className="p-4">
        <div className="space-y-3">
          <MetaRow icon={<FileType />} label="Type">
            <Badge label={mediaTypeLabel[item.type]} color={mediaTypeColor[item.type]} />
          </MetaRow>

          {item.duration != null && (
            <MetaRow icon={<Clock />} label="Duration">
              <Paragraph.sm>{formatDuration(item.duration)}</Paragraph.sm>
            </MetaRow>
          )}

          <MetaRow icon={<Calendar />} label="Created">
            <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(item.createdAt)}</Paragraph.sm>
          </MetaRow>
        </div>
      </div>

      {/* Source */}
      <Divider className="px-4 my-2" />
      <div className="p-4">
        <Label.md className="block pb-3">Source URL</Label.md>
        <div className="flex items-center gap-2">
          <Paragraph.sm className="text-tertiary truncate flex-1">{item.url}</Paragraph.sm>
          <Button.Icon
            variant="ghost"
            icon={copied ? <Check className="text-utility-green-700" /> : <Copy />}
            onClick={() => handleCopy(item.url)}
          />
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <Button.Icon variant="ghost" icon={<ExternalLink />} />
          </a>
        </div>
      </div>

      <Modal open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false) }}>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.Panel>
              <Modal.Header>
                <Label.md>Delete Media</Label.md>
              </Modal.Header>
              <Modal.Content className="p-4 flex-row gap-4">
                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                <Paragraph.sm className="text-secondary">
                  Are you sure you want to delete this media item? Playlist cues that reference it may be affected. This action cannot be undone.
                </Paragraph.sm>
              </Modal.Content>
              <Modal.Footer className="justify-end">
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Media"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal>
    </section>
  )
}
