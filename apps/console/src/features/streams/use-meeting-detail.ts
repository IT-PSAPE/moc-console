import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchZoomMeetingById } from "@/data/fetch-zoom";
import { deleteLocalZoomMeetingRecord, deleteZoomMeeting, updateZoomMeeting, type CreateMeetingParams } from "@/data/mutate-zoom";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useStreams } from "./streams-provider";

export function useMeetingDetail(id: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const { currentWorkspaceId, role } = useWorkspace();
  const { state: { zoomMeetings }, actions: { syncMeeting, removeMeeting } } = useStreams();
  const detail = useWorkspaceDetail({ fetcher: fetchZoomMeetingById, id, workspaceId: currentWorkspaceId });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localDeleteOpen, setLocalDeleteOpen] = useState(false);
  const [isRemovingLocal, setIsRemovingLocal] = useState(false);
  const copied = useCopyFeedback<"join" | "pass">();
  const cachedMeeting = zoomMeetings.find((item) => item.id === id) ?? null;
  const meeting = cachedMeeting ?? detail.data;
  const canCleanupLocal = Boolean(
    meeting
    && meeting.recurrenceType === "none"
    && meeting.startTime
    && new Date(meeting.startTime).getTime() + meeting.duration * 60_000 < Date.now(),
  );

  useEffect(() => {
    if (detail.data) syncMeeting(detail.data);
  }, [detail.data, syncMeeting]);

  const update = useCallback(async (params: CreateMeetingParams) => {
    if (!meeting) return;
    try {
      const updated = await updateZoomMeeting({ ...meeting, ...params });
      syncMeeting(updated);
      toast({ title: "Meeting updated", variant: "success" });
    } catch (error) {
      const message = getErrorMessage(error, "The meeting could not be updated.");
      toast({ title: "Failed to update meeting", description: message, variant: "error" });
      throw new Error(message);
    }
  }, [meeting, syncMeeting, toast]);

  const remove = useCallback(async () => {
    if (!meeting) return;
    setIsDeleting(true);
    try {
      await deleteZoomMeeting(meeting);
      removeMeeting(meeting.id);
      toast({ title: "Meeting deleted", variant: "success" });
      navigate("/streams");
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }, [meeting, navigate, removeMeeting, toast]);

  const removeLocal = useCallback(async () => {
    if (!meeting) return;
    setIsRemovingLocal(true);
    try {
      await deleteLocalZoomMeetingRecord(meeting.id);
      removeMeeting(meeting.id);
      toast({ title: "Local meeting record removed", variant: "success" });
      navigate("/streams");
    } catch (error) {
      toast({ title: "Failed to remove local meeting record", description: getErrorMessage(error, "The local record could not be removed."), variant: "error" });
    } finally {
      setIsRemovingLocal(false);
      setLocalDeleteOpen(false);
    }
  }, [meeting, navigate, removeMeeting, toast]);

  const copyJoinUrl = useCallback(() => {
    copied.actions.copy(meeting?.joinUrl, "join");
  }, [copied.actions, meeting?.joinUrl]);

  const copyPassword = useCallback(() => {
    copied.actions.copy(meeting?.password, "pass");
  }, [copied.actions, meeting?.password]);

  const state = useMemo(() => ({
    meeting,
    error: detail.error,
    isLoading: !cachedMeeting && detail.isLoading,
    editOpen,
    deleteOpen,
    isDeleting,
    localDeleteOpen,
    isRemovingLocal,
    copiedField: copied.state.copiedField,
    copyMessage: copied.state.copyMessage,
  }), [cachedMeeting, copied.state.copiedField, copied.state.copyMessage, deleteOpen, detail.error, detail.isLoading, editOpen, isDeleting, isRemovingLocal, localDeleteOpen, meeting]);

  return {
    state,
    actions: {
      setEditOpen,
      setDeleteOpen,
      setLocalDeleteOpen,
      update,
      remove,
      removeLocal,
      retry: detail.retry,
      copyJoinUrl,
      copyPassword,
    },
    meta: {
      canEdit: role?.can_update === true,
      canDelete: role?.can_delete === true,
      canCleanupLocal: role?.can_delete === true && canCleanupLocal,
    },
  };
}
