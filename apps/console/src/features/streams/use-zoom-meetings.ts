import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createZoomMeeting, deleteZoomMeeting, syncZoomMeetings, updateZoomMeeting, type CreateMeetingParams } from "@/data/mutate-zoom"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { useStreams } from "./streams-provider"
import { useProviderFailure } from "./use-provider-failure"
import { useZoomMeetingFilters } from "./use-zoom-meeting-filters"

export function useZoomMeetings(searchQuery: string) {
  const navigate = useNavigate()
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, zoomMeetings, isLoadingZoomConnection, isLoadingZoomMeetings },
    actions: { loadZoomConnection, loadZoomMeetings, syncMeeting, removeMeeting, setZoomMeetings, setZoomConnection },
  } = useStreams()
  const filters = useZoomMeetingFilters(zoomMeetings)
  const { setSearch } = filters
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const providerFailure = useProviderFailure(zoomConnection, setZoomConnection)
  const connectionNeedsReauth = zoomConnection?.status === "reauth_required"
  const needsReauth = connectionNeedsReauth || providerFailure.meta.needsConnection

  const actionableErrorMessage = useCallback((error: unknown, fallback: string): string => {
    return providerFailure.actions.record(error)?.message ?? getErrorMessage(error, fallback)
  }, [providerFailure.actions])

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

  const guardReauthentication = useCallback(() => {
    if (!needsReauth) return false
    toast({
      title: "Zoom needs reconnecting",
      description: "Reconnect Zoom in Settings to resume this action.",
      variant: "error",
    })
    return true
  }, [needsReauth, toast])

  const create = useCallback(async (params: CreateMeetingParams) => {
    if (guardReauthentication()) return
    try {
      const meeting = await createZoomMeeting(params)
      syncMeeting(meeting)
      providerFailure.actions.clear()
      toast({ title: "Meeting scheduled", variant: "success" })
    } catch (error) {
      const message = actionableErrorMessage(error, "The meeting could not be scheduled.")
      toast({ title: "Failed to schedule meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [actionableErrorMessage, guardReauthentication, providerFailure.actions, syncMeeting, toast])

  const update = useCallback(async (params: CreateMeetingParams) => {
    if (!editingMeeting || guardReauthentication()) return
    try {
      const { meeting, reconciliationWarning } = await updateZoomMeeting({ ...editingMeeting, ...params })
      syncMeeting(meeting)
      providerFailure.actions.clear()
      setEditingMeeting(null)
      if (reconciliationWarning) {
        toast({ title: "Meeting updated on Zoom", description: reconciliationWarning, variant: "warning" })
      } else {
        toast({ title: "Meeting updated", variant: "success" })
      }
    } catch (error) {
      const message = actionableErrorMessage(error, "The meeting could not be updated.")
      toast({ title: "Failed to update meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [actionableErrorMessage, editingMeeting, guardReauthentication, providerFailure.actions, syncMeeting, toast])

  const remove = useCallback(async (meeting: ZoomMeeting) => {
    if (guardReauthentication()) return
    try {
      await deleteZoomMeeting(meeting)
      removeMeeting(meeting.id)
      providerFailure.actions.clear()
      toast({ title: "Meeting deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: actionableErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
    }
  }, [actionableErrorMessage, guardReauthentication, providerFailure.actions, removeMeeting, toast])

  const sync = useCallback(async () => {
    if (guardReauthentication()) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      const meetings = await syncZoomMeetings()
      setZoomMeetings(meetings)
      providerFailure.actions.clear()
      toast({ title: "Meetings synced from Zoom", variant: "success" })
    } catch (error) {
      const message = actionableErrorMessage(error, "Meetings could not be synced from Zoom.")
      setSyncError(message)
      toast({ title: "Failed to sync meetings", description: message, variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [actionableErrorMessage, guardReauthentication, providerFailure.actions, setZoomMeetings, toast])

  function openFilters() {
    setFilterOpen(true)
  }

  function edit(meeting: ZoomMeeting) {
    setEditingMeeting(meeting)
    setModalOpen(true)
  }

  function openSettings() {
    navigate("/account/settings?tab=streams")
  }

  return {
    state: { modalOpen, editingMeeting, isSyncing, filterOpen, loadError, syncError },
    actions: { setModalOpen, setFilterOpen, openFilters, edit, create, update, remove, sync, retryLoad: load, openSettings },
    meta: {
      filters,
      isConnected: Boolean(zoomConnection),
      needsReauth,
      providerFailure: providerFailure.state.failure,
      canCreate: role?.can_create === true && !needsReauth,
      isLoading: isLoadingZoomMeetings || isLoadingZoomConnection,
    },
  }
}
