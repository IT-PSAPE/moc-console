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

type Options = { request: Request; enabled: boolean; refreshRecords: () => void }

export function useRequestWorkActions({ request, enabled, refreshRecords }: Options) {
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const { state: streamState, actions: streamActions } = useStreams()
  const { actions: checklistActions } = useChecklists()
  const { loadYouTubeConnection, loadZoomConnection, syncStream, syncMeeting } = streamActions
  const [streamOpen, setStreamOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)

  useEffect(() => {
    if (enabled && role?.can_create) void Promise.all([loadYouTubeConnection(), loadZoomConnection()])
  }, [enabled, loadYouTubeConnection, loadZoomConnection, role?.can_create])

  const createYouTube = useCallback(async (input: StreamFormData) => {
    try {
      const result = await createStream({ ...input, requestId: request.id })
      syncStream(result.stream)
      if (input.savePreset) {
        await saveStreamPreset(createStreamPreset(input, result.stream.thumbnailUrl)).catch((error: unknown) => {
          toast({ title: "Stream created; preset could not be saved", description: getErrorMessage(error, "Try saving the preset from Streams."), variant: "warning" })
        })
      }
      refreshRecords()
      toast({ title: "Stream created and linked", description: result.thumbnailError ?? undefined, variant: result.thumbnailError ? "warning" : "success" })
    } catch (error) {
      toast({ title: "Could not create stream", description: getErrorMessage(error, "Try again."), variant: "error" })
      throw error
    }
  }, [refreshRecords, request.id, syncStream, toast])

  const createZoom = useCallback(async (input: CreateMeetingParams) => {
    try {
      const meeting = await createZoomMeeting({ ...input, requestId: request.id })
      syncMeeting(meeting)
      refreshRecords()
      toast({ title: "Meeting created and linked", variant: "success" })
    } catch (error) {
      toast({ title: "Could not create meeting", description: getErrorMessage(error, "Try again."), variant: "error" })
      throw error
    }
  }, [refreshRecords, request.id, syncMeeting, toast])

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
  const youtubeAvailable = role?.can_create === true && streamState.youtubeConnection?.status === "active"
  const zoomAvailable = role?.can_create === true && streamState.zoomConnection?.status === "active"

  return {
    state: { streamOpen, checklistOpen },
    actions: { setStreamOpen, setChecklistOpen, openStream, openChecklist, createYouTube, createZoom, createChecklist },
    meta: { canCreate: role?.can_create === true, youtubeAvailable, zoomAvailable, canCreateStream: youtubeAvailable || zoomAvailable, youtubePreset: streamState.youtubeConnection?.presets ?? null },
  }
}
