import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import type { BroadcastEditorErrors, BroadcastFormSubmit } from "./broadcast-editor-types"
import { getBroadcastEditorErrors } from "./broadcast-editor-validation"
import { useBroadcastFiles } from "./use-broadcast-files"

type BroadcastFormOptions = { onOpenChange: (open: boolean) => void; onSubmit: (params: BroadcastFormSubmit) => Promise<void>; open: boolean }

export function useBroadcastForm({ onOpenChange, onSubmit, open }: BroadcastFormOptions) {
  const { toast } = useFeedback()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [kind, setKind] = useState<BroadcastKind>("audio")
  const [errors, setErrors] = useState<BroadcastEditorErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discardChangesOpen, setDiscardChangesOpen] = useState(false)
  const files = useBroadcastFiles({ kind, open })
  const isDirty = useMemo(() => title.trim().length > 0 || description.trim().length > 0 || files.state.items.length > 0, [description, files.state.items.length, title])

  useEffect(() => {
    if (!open) return
    setTitle("")
    setDescription("")
    setKind("audio")
    setErrors({})
    setDiscardChangesOpen(false)
  }, [open])

  function changeTitle(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
    setErrors((current) => ({ ...current, title: undefined }))
  }

  function changeDescription(event: ChangeEvent<HTMLTextAreaElement>) { setDescription(event.target.value) }

  function changeKind(value: string) {
    if (value === kind) return
    setKind(value as BroadcastKind)
    files.actions.reset()
    setErrors((current) => ({ ...current, playlist: undefined }))
  }

  async function submit() {
    const nextErrors = getBroadcastEditorErrors({ itemCount: files.state.items.length, title })
    setErrors(nextErrors)
    if (nextErrors.playlist || nextErrors.title) return
    files.actions.markUploadsQueued()
    setIsSubmitting(true)
    try {
      await onSubmit({ description: description.trim(), items: files.state.items, kind, onUploadStatusChange: files.actions.updateUploadStatus, title: title.trim() })
      setDiscardChangesOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast({ title: "Broadcast not created", description: error instanceof Error ? error.message : "The broadcast could not be created.", variant: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestClose() {
    if (isSubmitting) return
    if (isDirty) { setDiscardChangesOpen(true); return }
    onOpenChange(false)
  }

  function discardChanges() { setDiscardChangesOpen(false); onOpenChange(false) }
  function cancelDiscardChanges() { setDiscardChangesOpen(false) }

  return {
    state: { ...files.state, description, discardChangesOpen, errors, isSubmitting, items: files.state.items, kind, title, uploadProgress: files.state.uploadProgress },
    actions: { ...files.actions, changeDescription, changeKind, changeTitle, discardChanges, requestClose, cancelDiscardChanges, submit },
    meta: { submitLabel: isSubmitting ? "Creating…" : "Create broadcast" },
  }
}
