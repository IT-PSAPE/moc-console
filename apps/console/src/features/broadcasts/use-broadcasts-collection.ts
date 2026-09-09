import { useListDetailSelection } from "@/hooks/use-list-detail-selection"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useBroadcasts } from "./broadcasts-provider"
import type { BroadcastFormSubmit } from "./broadcast-editor-types"

function matchesQuery(broadcast: Broadcast, query: string): boolean {
  if (`${broadcast.title} ${broadcast.description} ${broadcast.slug}`.toLowerCase().includes(query)) return true
  return broadcast.items.some((item) => item.title.toLowerCase().includes(query))
}

export function useBroadcastsCollection() {
  const { state: broadcastsState, actions: broadcastActions, meta: broadcastsMeta } = useBroadcasts()
  const { createBroadcast, deleteBroadcast, loadBroadcasts, retryBroadcasts, updateBroadcast } = broadcastActions
  const { toast } = useFeedback()
  const [searchQuery, setSearchQuery] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { void loadBroadcasts() }, [loadBroadcasts])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return broadcastsState.broadcasts
    return broadcastsState.broadcasts.filter((broadcast) => matchesQuery(broadcast, query))
  }, [broadcastsState.broadcasts, searchQuery])

  const detail = useListDetailSelection<Broadcast>(broadcastsState.broadcasts)
  const { close: closeDetail, select: selectBroadcast } = detail.actions

  const openCreate = useCallback(() => {
    setEditingBroadcast(null)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((broadcast: Broadcast) => {
    setEditingBroadcast(broadcast)
    setEditorOpen(true)
  }, [])

  const openDelete = useCallback((broadcast: Broadcast) => {
    setDeleteTarget(broadcast)
  }, [])

  const setDeleteOpen = useCallback((open: boolean) => {
    if (!open && !isDeleting) setDeleteTarget(null)
  }, [isDeleting])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const result = await deleteBroadcast({ id: deleteTarget.id })
      closeDetail()
      setEditingBroadcast((current) => current?.id === deleteTarget.id ? null : current)
      setDeleteTarget(null)

      if (result.storageCleanupError) {
        toast({
          title: "Broadcast deleted with incomplete file cleanup",
          description: getErrorMessage(result.storageCleanupError, "Some uploaded files could not be removed."),
          variant: "warning",
        })
        return
      }

      toast({ title: "Broadcast deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Couldn't delete broadcast", description: getErrorMessage(error, "The broadcast could not be deleted."), variant: "error" })
    } finally {
      setIsDeleting(false)
    }
  }, [closeDetail, deleteBroadcast, deleteTarget, toast])

  const submitEditor = useCallback(async ({ description, items, kind, onUploadStatusChange, title }: BroadcastFormSubmit) => {
    if (editingBroadcast) {
      const saved = await updateBroadcast({
        currentItems: editingBroadcast.items,
        description,
        expectedUpdatedAt: editingBroadcast.updatedAt,
        id: editingBroadcast.id,
        items: items.map((item) => item.source === "existing" ? { id: item.item.id, source: "existing" } : { clientId: item.key, file: item.file, source: "upload" }),
        kind,
        onUploadStatusChange,
        title,
      })
      setEditingBroadcast(saved)
      toast({ title: "Broadcast updated", variant: "success" })
      return
    }

    const created = await createBroadcast({
      description,
      files: items.flatMap((item) => item.source === "upload" ? [{ clientId: item.key, file: item.file }] : []),
      kind,
      onUploadStatusChange,
      title,
    })
    selectBroadcast(created)
    toast({ title: "Broadcast created", variant: "success" })
  }, [createBroadcast, editingBroadcast, selectBroadcast, toast, updateBroadcast])

  const retry = useCallback(() => { void retryBroadcasts() }, [retryBroadcasts])

  return {
    state: {
      detailOpen: detail.state.isOpen,
      deleteTarget,
      editingBroadcast,
      editorOpen,
      isLoading: broadcastsState.isLoadingBroadcasts,
      isDeleting,
      loadError: broadcastsState.broadcastsError,
      searchQuery,
      selectedBroadcast: detail.state.selectedItem,
    },
    actions: { closeDetail, confirmDelete, openCreate, openDelete, openEdit, retry, selectBroadcast, setDeleteOpen, setEditorOpen, setSearchQuery, submitEditor },
    meta: {
      canCreate: broadcastsMeta.canCreate,
      canDelete: broadcastsMeta.canDelete,
      canEdit: broadcastsMeta.canUpdate,
      filtered,
      isFiltered: searchQuery.trim().length > 0,
    },
  }
}
