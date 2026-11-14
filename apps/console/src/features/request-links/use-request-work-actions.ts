import { createStreamPreset } from "@/features/streams/stream-preset"
import { createStream, saveStreamPreset } from "@/data/mutate-streams"
import { createZoomMeeting, type CreateMeetingParams } from "@/data/mutate-zoom"
import { useChecklists } from "@/features/checklists/checklists-provider"
import type { ChecklistRunSubmit } from "@/features/checklists/use-create-checklist-run"
import { useStreams } from "@/features/streams/streams-provider"
import type { StreamFormData } from "@/features/streams/use-stream-form"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import type { Request } from "@moc/types/requests"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useCallback, useEffect, useState } from "react"
import { canCreateYouTubeStreams } from "@/data/youtube-broadcast-reconciliation"
import { canCreateZoomMeetings } from "@/data/zoom-meeting-reconciliation"

type Options = { request: Request; enabled: boolean; refreshRecords: () => void }

export function useRequestWorkActions({ request, enabled, refreshRecords }: Options) {
  const { role, currentWorkspaceId } = useWorkspace()
  const { toast } = useFeedback()
  const { state: streamState, actions: streamActions } = useStreams()
  const { actions: checklistActions } = useChecklists()
  const { loadYouTubeConnection, loadZoomConnection, syncStream, syncMeeting } = streamActions
  const [streamOpen, setStreamOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const canCreateYouTube = canCreateYouTubeStreams(role)
  const canCreateZoom = canCreateZoomMeetings(role)
  const youtubeAvailable = canCreateYouTube && streamState.youtubeConnection?.status === "active"
  const zoomAvailable = canCreateZoom && streamState.zoomConnection?.status === "active"

  useEffect(() => {
    if (!enabled) return
    const tasks: Promise<void>[] = []
    if (canCreateYouTube) tasks.push(loadYouTubeConnection())
    if (canCreateZoom) tasks.push(loadZoomConnection())
    void Promise.all(tasks)
  }, [canCreateYouTube, canCreateZoom, enabled, loadYouTubeConnection, loadZoomConnection])

  const createYouTube = useCallback(async (input: StreamFormData) => {
    if (!currentWorkspaceId) throw new Error("Select a workspace before creating a stream")
    try {
      if (!youtubeAvailable) throw new Error("Creating a YouTube stream requires an active connection and read, create, and update permission for this workspace.")
      const result = await createStream({ ...input, requestId: request.id }, currentWorkspaceId)
      syncStream(result.stream)
      if (input.savePreset) {
        await saveStreamPreset(createStreamPreset(input, result.stream.thumbnailUrl), { workspaceId: currentWorkspaceId, signal: input.signal }).catch((error: unknown) => {
          toast({ title: "Stream created; preset could not be saved", description: getErrorMessage(error, "Try saving the preset from Streams."), variant: "warning" })
        })
      }
      refreshRecords()
      toast({ title: "Stream created and linked", description: result.thumbnailError ?? undefined, variant: result.thumbnailError ? "warning" : "success" })
    } catch (error) {
      toast({ title: "Could not create stream", description: getErrorMessage(error, "Try again."), variant: "error" })
      throw error
    }
  }, [currentWorkspaceId, refreshRecords, request.id, syncStream, toast, youtubeAvailable])

  const createZoom = useCallback(async (input: CreateMeetingParams) => {
    if (!currentWorkspaceId) throw new Error("Select a workspace before creating a meeting")
    try {
      if (!zoomAvailable) throw new Error("Creating a Zoom meeting requires an active connection and read and create permission for this workspace.")
      const meeting = await createZoomMeeting({ ...input, requestId: request.id }, currentWorkspaceId)
      syncMeeting(meeting)
      refreshRecords()
      toast({ title: "Meeting created and linked", variant: "success" })
    } catch (error) {
      toast({ title: "Could not create meeting", description: getErrorMessage(error, "Try again."), variant: "error" })
      throw error
    }
  }, [currentWorkspaceId, refreshRecords, request.id, syncMeeting, toast, zoomAvailable])

  const createChecklist = useCallback(async (input: ChecklistRunSubmit) => {
    try {
      await checklistActions.createBlankChecklist({ name: input.name, description: input.description, requestId: request.id })
      refreshRecords()
      toast({ title: "Checklist created and linked", variant: "success" })
    } catch (error) {
      toast({ title: "Could not create checklist", description: getErrorMessage(error, "Try again."), variant: "error" })
      throw error
    }
  }, [checklistActions, refreshRecords, request.id, toast])
  const openStream = useCallback(() => { setStreamOpen(true) }, [])
  const openChecklist = useCallback(() => { setChecklistOpen(true) }, [])

  return {
    state: { streamOpen, checklistOpen },
    actions: { setStreamOpen, setChecklistOpen, openStream, openChecklist, createYouTube, createZoom, createChecklist },
    meta: { canCreate: role?.can_create === true, youtubeAvailable, zoomAvailable, canCreateStream: youtubeAvailable || zoomAvailable, youtubePreset: streamState.youtubeConnection?.presets ?? null },
  }
}
