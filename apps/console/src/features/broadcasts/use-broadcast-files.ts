import type { BroadcastUploadStatus } from "@/data/mutate-broadcasts"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useMemo, useRef, useState } from "react"
import type { BroadcastEditorUploadItem } from "./broadcast-editor-types"
import { checkBroadcastFiles } from "./broadcast-file-check"
import type { FilePartition, FileRejection } from "@moc/utils/file-constraints"

type BroadcastFilesOptions = { kind: BroadcastKind; open: boolean }

export function useBroadcastFiles({ kind, open }: BroadcastFilesOptions) {
  const { toast } = useFeedback()
  const [items, setItems] = useState<BroadcastEditorUploadItem[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [rejections, setRejections] = useState<FileRejection[]>([])
  const generation = useRef(0)
  const checking = useRef(false)

  useEffect(() => {
    reset()
    return () => {
      generation.current += 1
      checking.current = false
    }
  }, [open])

  const uploadProgress = useMemo(() => ({
    complete: items.filter((item) => item.status === "complete").length,
    total: items.length,
  }), [items])

  async function addFiles({ acceptedFiles, rejections: constraintRejections }: FilePartition) {
    if (checking.current || (acceptedFiles.length === 0 && constraintRejections.length === 0)) return
    const requestGeneration = generation.current
    checking.current = true
    setRejections(constraintRejections)
    setIsChecking(true)
    try {
      const checked = await checkBroadcastFiles(acceptedFiles, kind)
      if (requestGeneration !== generation.current) return
      const addedItems = checked.acceptedFiles.map((file): BroadcastEditorUploadItem => ({ file, key: crypto.randomUUID(), source: "upload", status: "queued" }))
      const batchRejections = [...constraintRejections, ...checked.rejections]
      if (addedItems.length > 0) setItems((current) => [...current, ...addedItems])
      setRejections(batchRejections)
      if (batchRejections.length > 0) {
        const [first] = batchRejections
        toast({
          title: `${batchRejections.length} ${batchRejections.length === 1 ? "file" : "files"} rejected`,
          description: batchRejections.length === 1 ? `${first.file.name} — ${first.reason}` : `${addedItems.length} added. Each rejected file is listed with its reason.`,
          variant: "error",
        })
      }
    } finally {
      if (requestGeneration === generation.current) {
        checking.current = false
        setIsChecking(false)
      }
    }
  }

  function dismissRejections() { setRejections([]) }

  function reset() {
    generation.current += 1
    checking.current = false
    setIsChecking(false)
    setItems([])
    setRejections([])
  }

  function removeItem(key: string) { setItems((current) => current.filter((item) => item.key !== key)) }

  function reorderItems(activeId: string, overId: string) {
    setItems((current) => {
      const from = current.findIndex((item) => item.key === activeId)
      const to = current.findIndex((item) => item.key === overId)
      if (from < 0 || to < 0 || from === to) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function updateUploadStatus(clientId: string, status: BroadcastUploadStatus, error?: string) {
    setItems((current) => current.map((item) => item.key === clientId ? { ...item, error, status } : item))
  }

  function markUploadsQueued() {
    setItems((current) => current.map((item) => ({ ...item, error: undefined, status: "queued" })))
  }

  return {
    state: { isChecking, items, rejections, uploadProgress },
    actions: { addFiles, dismissRejections, markUploadsQueued, removeItem, reorderItems, reset, updateUploadStatus },
  }
}
