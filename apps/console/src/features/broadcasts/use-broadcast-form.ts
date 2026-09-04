import type { BroadcastUploadStatus } from "@/data/mutate-broadcasts"
import type { Broadcast, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import type { BroadcastEditorErrors, BroadcastEditorItem, BroadcastEditorUploadItem, BroadcastFormSubmit } from "./broadcast-editor-types"
import { getBroadcastEditorErrors, splitBroadcastFilesByKind } from "./broadcast-editor-validation"

type BroadcastFormOptions = {
  broadcast?: Broadcast | null
  onOpenChange: (open: boolean) => void
  onSubmit: (params: BroadcastFormSubmit) => Promise<void>
  open: boolean
}

const defaultKind: BroadcastKind = "audio"

function toEditorItems(broadcast: Broadcast | null | undefined): BroadcastEditorItem[] {
  return (broadcast?.items ?? []).map((item) => ({ item, key: `existing:${item.id}`, source: "existing" }))
}

export function useBroadcastForm({ broadcast, onOpenChange, onSubmit, open }: BroadcastFormOptions) {
  const { toast } = useFeedback()
  const isEditing = Boolean(broadcast)
  const [title, setTitle] = useState(broadcast?.title ?? "")
  const [description, setDescription] = useState(broadcast?.description ?? "")
  const [kind, setKind] = useState<BroadcastKind>(broadcast?.kind ?? defaultKind)
  const [items, setItems] = useState<BroadcastEditorItem[]>(() => toEditorItems(broadcast))
  const [errors, setErrors] = useState<BroadcastEditorErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discardChangesOpen, setDiscardChangesOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(broadcast?.title ?? "")
    setDescription(broadcast?.description ?? "")
    setKind(broadcast?.kind ?? defaultKind)
    setItems(toEditorItems(broadcast))
    setErrors({})
    setDiscardChangesOpen(false)
  }, [broadcast, open])

  const uploadProgress = useMemo(() => {
    const uploads = items.filter((item): item is BroadcastEditorUploadItem => item.source === "upload")
    return { complete: uploads.filter((item) => item.status === "complete").length, total: uploads.length }
  }, [items])

  const isDirty = useMemo(() => {
    if (!isEditing) return title.trim().length > 0 || description.trim().length > 0 || items.length > 0
    const originalKeys = toEditorItems(broadcast).map((item) => item.key).join("|")
    const currentKeys = items.map((item) => item.key).join("|")
    return title !== broadcast?.title || description !== broadcast?.description || originalKeys !== currentKeys
  }, [broadcast, description, isEditing, items, title])

  function changeTitle(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
    setErrors((current) => ({ ...current, title: undefined }))
  }

  function changeDescription(event: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.target.value)
  }

  function changeKind(value: string) {
    if (isEditing || value === kind) return
    setKind(value as BroadcastKind)
    setItems([])
    setErrors((current) => ({ ...current, playlist: undefined }))
  }

  function addFiles(files: File[]) {
    const { acceptedFiles, rejectedFiles } = splitBroadcastFilesByKind(kind, files)
    const addedItems = acceptedFiles.map((file): BroadcastEditorUploadItem => ({ file, key: crypto.randomUUID(), source: "upload", status: "queued" }))

    if (addedItems.length > 0) {
      setItems((current) => [...current, ...addedItems])
      setErrors((current) => ({ ...current, playlist: undefined }))
    }

    if (rejectedFiles.length > 0) {
      toast({
        title: "Some files were not added",
        description: `Only ${kind} files belong in this playlist. Skipped: ${rejectedFiles.map((file) => file.name).join(", ")}.`,
        variant: "error",
      })
    }
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key))
    setErrors((current) => ({ ...current, playlist: undefined }))
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.key === key)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next
    })
  }

  function updateUploadStatus(clientId: string, status: BroadcastUploadStatus, error?: string) {
    setItems((current) => current.map((item) => item.source === "upload" && item.key === clientId ? { ...item, error, status } : item))
  }

  function markUploadsQueued() {
    setItems((current) => current.map((item) => item.source === "upload" ? { ...item, error: undefined, status: "queued" } : item))
  }

  async function submit() {
    const nextErrors = getBroadcastEditorErrors({ itemCount: items.length, title })
    setErrors(nextErrors)
    if (nextErrors.playlist || nextErrors.title) return

    markUploadsQueued()
    setIsSubmitting(true)

    try {
      await onSubmit({ description: description.trim(), items, kind, onUploadStatusChange: updateUploadStatus, title: title.trim() })
      setDiscardChangesOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: isEditing ? "Broadcast not updated" : "Broadcast not created",
        description: error instanceof Error ? error.message : "The broadcast could not be saved.",
        variant: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestClose() {
    if (isSubmitting) return
    if (isDirty) {
      setDiscardChangesOpen(true)
      return
    }
    onOpenChange(false)
  }

  function discardChanges() {
    setDiscardChangesOpen(false)
    onOpenChange(false)
  }

  function cancelDiscardChanges() {
    setDiscardChangesOpen(false)
  }

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    requestClose()
  }

  return {
    state: { description, discardChangesOpen, errors, isSubmitting, items, kind, title, uploadProgress },
    actions: { addFiles, cancelDiscardChanges, changeDescription, changeKind, changeOpen, changeTitle, discardChanges, moveItem, removeItem, requestClose, submit },
    meta: { isEditing, submitLabel: isSubmitting ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save changes" : "Create broadcast") },
  }
}
