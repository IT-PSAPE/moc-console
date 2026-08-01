import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createZoomMeeting, deleteZoomMeeting, syncZoomMeetings, updateZoomMeeting, type CreateMeetingParams } from "@/data/mutate-zoom"
import { useAuth } from "@/lib/auth-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { useStreams } from "./streams-provider"
import { useZoomMeetingFilters } from "./use-zoom-meeting-filters"

export function useZoomMeetings(searchQuery: string) {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, zoomMeetings, isLoadingZoomMeetings },
    actions: { loadZoomConnection, loadZoomMeetings, syncMeeting, removeMeeting, setZoomMeetings },
  } = useStreams()
  const filters = useZoomMeetingFilters(zoomMeetings)
  const { setSearch } = filters
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null)
  const [drawerMeeting, setDrawerMeeting] = useState<ZoomMeeting | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    void loadZoomConnection()
    void loadZoomMeetings()
  }, [loadZoomConnection, loadZoomMeetings])

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
      setDrawerOpen(false)
      toast({ title: "Meeting deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
    }
  }, [removeMeeting, toast])

  const sync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const meetings = await syncZoomMeetings()
      setZoomMeetings(meetings)
      toast({ title: "Meetings synced from Zoom", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to sync meetings", description: getErrorMessage(error, "Meetings could not be synced from Zoom."), variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [setZoomMeetings, toast])

  function openCreate() {
    setEditingMeeting(null)
    setModalOpen(true)
  }

  function openFilters() {
    setFilterOpen(true)
  }

  function openDetail(meeting: ZoomMeeting) {
    setDrawerMeeting(meeting)
    setDrawerOpen(true)
  }

  function edit(meeting: ZoomMeeting) {
    setDrawerOpen(false)
    setEditingMeeting(meeting)
    setModalOpen(true)
  }

  function openSettings() {
    navigate("/account/settings?tab=streams")
  }

  return {
    state: { modalOpen, editingMeeting, drawerMeeting, drawerOpen, isSyncing, filterOpen },
    actions: { setModalOpen, setDrawerOpen, setFilterOpen, openCreate, openFilters, openDetail, edit, create, update, remove, sync, openSettings },
    meta: {
      filters,
      isConnected: Boolean(zoomConnection),
      canCreate: role?.can_create === true,
      isLoading: isLoadingZoomMeetings,
    },
  }
}
