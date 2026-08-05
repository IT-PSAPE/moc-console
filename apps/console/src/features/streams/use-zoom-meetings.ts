import { useCallback, useEffect, useState } from "react"
import { createZoomMeeting, deleteZoomMeeting, syncZoomMeetings, updateZoomMeeting, type CreateMeetingParams } from "@/data/mutate-zoom"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { useStreams } from "./streams-provider"
import { useZoomMeetingFilters } from "./use-zoom-meeting-filters"

export function useZoomMeetings(searchQuery: string) {
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, zoomMeetings, isLoadingZoomConnection, isLoadingZoomMeetings },
    actions: { loadZoomConnection, loadZoomMeetings, syncMeeting, removeMeeting, setZoomMeetings },
  } = useStreams()
  const filters = useZoomMeetingFilters(zoomMeetings)
  const { setSearch } = filters
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      await Promise.all([loadZoomConnection(), loadZoomMeetings()])
      setLoadError(null)
    } catch (error) {
      setLoadError(getErrorMessage(error, "Meetings could not be loaded."))
    }
  }, [loadZoomConnection, loadZoomMeetings])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  const create = useCallback(async (params: CreateMeetingParams) => {
    try {
      const meeting = await createZoomMeeting(params)
      syncMeeting(meeting)
      toast({ title: "Meeting scheduled", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The meeting could not be scheduled.")
      toast({ title: "Failed to schedule meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [syncMeeting, toast])

  const update = useCallback(async (params: CreateMeetingParams) => {
    if (!editingMeeting) return
    try {
      const meeting = await updateZoomMeeting({ ...editingMeeting, ...params })
      syncMeeting(meeting)
      setEditingMeeting(null)
      toast({ title: "Meeting updated", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The meeting could not be updated.")
      toast({ title: "Failed to update meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [editingMeeting, syncMeeting, toast])

  const remove = useCallback(async (meeting: ZoomMeeting) => {
    try {
      await deleteZoomMeeting(meeting)
      removeMeeting(meeting.id)
      toast({ title: "Meeting deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
    }
  }, [removeMeeting, toast])

  const sync = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const meetings = await syncZoomMeetings()
      setZoomMeetings(meetings)
      toast({ title: "Meetings synced from Zoom", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "Meetings could not be synced from Zoom.")
      setSyncError(message)
      toast({ title: "Failed to sync meetings", description: message, variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [setZoomMeetings, toast])

  function openFilters() {
    setFilterOpen(true)
  }

  function edit(meeting: ZoomMeeting) {
    setEditingMeeting(meeting)
    setModalOpen(true)
  }

  return {
    state: { modalOpen, editingMeeting, isSyncing, filterOpen, loadError, syncError },
    actions: { setModalOpen, setFilterOpen, openFilters, edit, create, update, remove, sync, retryLoad: load },
    meta: {
      filters,
      isConnected: Boolean(zoomConnection),
      canCreate: role?.can_create === true,
      isLoading: isLoadingZoomMeetings || isLoadingZoomConnection,
    },
  }
}
