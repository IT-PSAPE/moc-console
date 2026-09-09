import { useListDetailSelection } from "@/hooks/use-list-detail-selection"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useBroadcasts } from "./broadcasts-provider"
import type { BroadcastFormSubmit } from "./broadcast-editor-types"

function matchesQuery(broadcast: Broadcast, query: string): boolean {
  if (`${broadcast.title} ${broadcast.description} ${broadcast.slug}`.toLowerCase().includes(query)) return true
  return broadcast.items.some((item) => item.title.toLowerCase().includes(query))
}

export function useBroadcastsCollection() {
  const { state: broadcastsState, actions: broadcastActions, meta: broadcastsMeta } = useBroadcasts()
  const { createBroadcast, loadBroadcasts, retryBroadcasts, updateBroadcast } = broadcastActions
  const { toast } = useFeedback()
  const [searchQuery, setSearchQuery] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)

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
      editingBroadcast,
      editorOpen,
      isLoading: broadcastsState.isLoadingBroadcasts,
      loadError: broadcastsState.broadcastsError,
      searchQuery,
      selectedBroadcast: detail.state.selectedItem,
    },
    actions: { closeDetail, openCreate, openEdit, retry, selectBroadcast, setEditorOpen, setSearchQuery, submitEditor },
    meta: {
      canCreate: broadcastsMeta.canCreate,
      canEdit: broadcastsMeta.canUpdate,
      filtered,
      isFiltered: searchQuery.trim().length > 0,
    },
  }
}
