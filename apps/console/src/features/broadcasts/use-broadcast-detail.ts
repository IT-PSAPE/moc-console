import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import type { BroadcastPlaylistUpdateItem, BroadcastUploadStatusChange } from "@/data/mutate-broadcasts"
import { arrayMove } from "@dnd-kit/sortable"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useEffect, useRef, useState } from "react"
import type { BroadcastEditorItem, BroadcastUploadSubmit } from "./broadcast-editor-types"
import { useBroadcasts } from "./broadcasts-provider"
import { getBroadcastPublicUrl } from "./broadcast-public-url"

export function useBroadcastDetail(broadcast: Broadcast) {
  const copied = useCopyFeedback<"link">()
  const { actions: { updateBroadcast }, meta: { canUpdate } } = useBroadcasts()
  const { toast } = useFeedback()
  const [pending, setPending] = useState<Broadcast | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const savingRef = useRef(false)
  const currentRef = useRef(broadcast)
  const displayed = pending ?? broadcast
  const publicUrl = getBroadcastPublicUrl(displayed.slug)

  useEffect(() => {
    if (!savingRef.current) currentRef.current = broadcast
  }, [broadcast])

  async function persist(next: Broadcast, uploads: BroadcastPlaylistUpdateItem[] = [], onUploadStatusChange?: BroadcastUploadStatusChange): Promise<void> {
    if (!canUpdate) throw new Error("You don't have permission to edit this broadcast.")
    if (savingRef.current) throw new Error("Wait for the current change to finish saving.")
    savingRef.current = true
    setIsSaving(true)
    setPending(next)
    const current = currentRef.current
    try {
      const saved = await updateBroadcast({
        id: current.id,
        expectedUpdatedAt: current.updatedAt,
        currentItems: current.items,
        title: next.title,
        description: next.description,
        kind: current.kind,
        items: [...next.items.map((item): BroadcastPlaylistUpdateItem => ({ source: "existing", id: item.id })), ...uploads],
        onUploadStatusChange,
      })
      currentRef.current = saved
    } finally {
      savingRef.current = false
      setIsSaving(false)
      setPending(null)
    }
  }

  async function commit(next: Broadcast): Promise<void> {
    try {
      await persist(next)
    } catch (error) {
      toast({ title: "Broadcast not updated", description: getErrorMessage(error, "The change could not be saved."), variant: "error" })
    }
  }

  function saveTitle(value: string): void {
    const title = value.trim()
    if (!title || title === currentRef.current.title) return
    void commit({ ...currentRef.current, title })
  }

  function saveDescription(value: string): void {
    const description = value.trim()
    if (description === currentRef.current.description) return
    void commit({ ...currentRef.current, description })
  }

  function reorderItem(activeId: string, overId: string): void {
    const current = currentRef.current
    const from = current.items.findIndex((item) => `existing:${item.id}` === activeId)
    const to = current.items.findIndex((item) => `existing:${item.id}` === overId)
    if (from < 0 || to < 0 || from === to || savingRef.current) return
    void commit({ ...current, items: arrayMove(current.items, from, to) })
  }

  function removeItem(key: string): void {
    const current = currentRef.current
    if (current.items.length <= 1 || savingRef.current) return
    void commit({ ...current, items: current.items.filter((item) => `existing:${item.id}` !== key) })
  }

  function openUpload(): void {
    if (canUpdate && !savingRef.current) setUploadOpen(true)
  }

  function changeUploadOpen(open: boolean): void {
    if (!savingRef.current) setUploadOpen(open)
  }

  async function submitUploads({ items, onUploadStatusChange }: BroadcastUploadSubmit): Promise<void> {
    const uploads = items.flatMap((item): BroadcastPlaylistUpdateItem[] => item.source === "upload" ? [{ source: "upload", clientId: item.key, file: item.file }] : [])
    if (uploads.length === 0) return
    await persist(currentRef.current, uploads, onUploadStatusChange)
    toast({ title: "Files added to broadcast", variant: "success" })
  }

  async function copyPublicUrl(): Promise<void> {
    await copied.actions.copy(publicUrl, "link")
  }

  const items: BroadcastEditorItem[] = displayed.items.map((item) => ({ item, key: `existing:${item.id}`, source: "existing" }))

  return {
    state: { broadcast: displayed, copiedField: copied.state.copiedField, isSaving, items, uploadOpen },
    actions: { changeUploadOpen, copyPublicUrl, openUpload, removeItem, reorderItem, saveDescription, saveTitle, submitUploads },
    meta: {
      canEdit: canUpdate,
      itemKeys: items.map((item) => item.key),
      playlistLabel: `${BROADCAST_KIND_LABELS[displayed.kind]} · ${items.length} ${items.length === 1 ? "item" : "items"}`,
      publicUrl,
      updatedAt: formatUtcIsoInBrowserTimeZone(displayed.updatedAt, { dateStyle: "medium", timeStyle: "short" }),
    },
  }
}
