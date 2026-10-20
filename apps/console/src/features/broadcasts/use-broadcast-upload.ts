import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useState } from "react"
import type { BroadcastUploadSubmit } from "./broadcast-editor-types"
import { useBroadcastFiles } from "./use-broadcast-files"

type BroadcastUploadOptions = { broadcast: Broadcast; disabled?: boolean; onOpenChange: (open: boolean) => void; onSubmit: (params: BroadcastUploadSubmit) => Promise<void>; open: boolean }

export function useBroadcastUpload({ broadcast, disabled = false, onOpenChange, onSubmit, open }: BroadcastUploadOptions) {
  const { toast } = useFeedback()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const files = useBroadcastFiles({ kind: broadcast.kind, open })
  const isLocked = disabled || isSubmitting

  useEffect(() => {
    if (open) setError(undefined)
  }, [open])

  async function submit() {
    if (isLocked || files.state.isChecking) return
    if (files.state.items.length === 0) {
      setError("Add at least one file to the playlist.")
      return
    }
    setError(undefined)
    files.actions.markUploadsQueued()
    setIsSubmitting(true)
    try {
      await onSubmit({ items: files.state.items, onUploadStatusChange: files.actions.updateUploadStatus })
      files.actions.reset()
      onOpenChange(false)
    } catch (submitError) {
      toast({ title: "Files not uploaded", description: submitError instanceof Error ? submitError.message : "The files could not be uploaded.", variant: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  function cancel() {
    if (isLocked) return
    files.actions.reset()
    onOpenChange(false)
  }

  return {
    state: { ...files.state, error, isSubmitting, isLocked },
    actions: { ...files.actions, cancel, submit },
  }
}
