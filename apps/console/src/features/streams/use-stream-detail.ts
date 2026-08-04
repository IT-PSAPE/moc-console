import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteLocalStreamRecord, deleteStream, updateStream } from "@/data/mutate-streams";
import { fetchStreamById } from "@/data/fetch-streams";
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";
import type { StreamFormData } from "./use-stream-form";
import { useStreams } from "./streams-provider";

export function useStreamDetail(id: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const { role } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const { state: { streams }, actions: { syncStream, removeStream } } = useStreams();
  const detail = useWorkspaceDetail({ fetcher: fetchStreamById, id, workspaceId: currentWorkspaceId });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localDeleteOpen, setLocalDeleteOpen] = useState(false);
  const [isRemovingLocal, setIsRemovingLocal] = useState(false);
  const copied = useCopyFeedback<"url" | "key" | "ingestion">();
  const cachedStream = streams.find((item) => item.id === id) ?? null;
  const stream = cachedStream ?? detail.data;
  const canCleanupLocal = Boolean(
    stream
    && (stream.streamStatus === "complete"
      || stream.actualEndTime
      || (stream.scheduledStartTime && new Date(stream.scheduledStartTime).getTime() < Date.now())),
  );

  useEffect(() => {
    if (detail.data) syncStream(detail.data);
  }, [detail.data, syncStream]);

  const update = useCallback(async (params: StreamFormData) => {
    if (!stream) return;
    try {
      const { thumbnail, ...fields } = params;
      const { stream: updated, thumbnailError } = await updateStream({ ...stream, ...fields }, thumbnail);
      syncStream(updated);
      toast(thumbnailError
        ? { title: "Stream updated, but the thumbnail wasn't applied", description: thumbnailError, variant: "warning" }
        : { title: "Stream updated", variant: "success" });
    } catch (error) {
      const message = getErrorMessage(error, "The stream could not be updated.");
      toast({ title: "Failed to update stream", description: message, variant: "error" });
      throw new Error(message);
    }
  }, [stream, syncStream, toast]);

  const remove = useCallback(async () => {
    if (!stream) return;
    setIsDeleting(true);
    try {
      await deleteStream(stream);
      removeStream(stream.id);
      toast({ title: "Stream deleted", variant: "success" });
      navigate("/streams");
    } catch (error) {
      toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }, [navigate, removeStream, stream, toast]);

  const removeLocal = useCallback(async () => {
    if (!stream) return;
    setIsRemovingLocal(true);
    try {
      await deleteLocalStreamRecord(stream.id);
      removeStream(stream.id);
      toast({ title: "Local stream record removed", variant: "success" });
      navigate("/streams");
    } catch (error) {
      toast({ title: "Failed to remove local stream record", description: getErrorMessage(error, "The local record could not be removed."), variant: "error" });
    } finally {
      setIsRemovingLocal(false);
      setLocalDeleteOpen(false);
    }
  }, [navigate, removeStream, stream, toast]);

  const copyStreamUrl = useCallback(() => {
    copied.actions.copy(stream?.streamUrl, "url");
  }, [copied.actions, stream?.streamUrl]);

  const copyStreamKey = useCallback(() => {
    copied.actions.copy(stream?.streamKey, "key");
  }, [copied.actions, stream?.streamKey]);

  const copyIngestionUrl = useCallback(() => {
    copied.actions.copy(stream?.ingestionUrl, "ingestion");
  }, [copied.actions, stream?.ingestionUrl]);

  const state = useMemo(() => ({
    stream,
    error: detail.error,
    isLoading: !cachedStream && detail.isLoading,
    editOpen,
    deleteOpen,
    isDeleting,
    localDeleteOpen,
    isRemovingLocal,
    copiedField: copied.state.copiedField,
    copyMessage: copied.state.copyMessage,
  }), [cachedStream, copied.state.copiedField, copied.state.copyMessage, deleteOpen, detail.error, detail.isLoading, editOpen, isDeleting, isRemovingLocal, localDeleteOpen, stream]);

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
      copyStreamUrl,
      copyStreamKey,
      copyIngestionUrl,
    },
    meta: {
      canEdit: role?.can_update === true,
      canDelete: role?.can_delete === true,
      canViewStreamKey: role?.can_create === true,
      canCleanupLocal: role?.can_delete === true && canCleanupLocal,
    },
  };
}
