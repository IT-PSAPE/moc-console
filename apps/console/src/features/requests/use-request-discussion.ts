import { createRequestComment, fetchRequestActivity, fetchRequestComments } from "@/data/request-history";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { RequestActivity, RequestComment } from "@moc/types/requests";

type RequestDiscussion = { activity: RequestActivity[]; comments: RequestComment[] };
const emptyDiscussion: RequestDiscussion = { activity: [], comments: [] };

export function useRequestDiscussion(requestId: string, enabled = true, refreshKey?: string) {
  const { currentWorkspaceId } = useWorkspace();
  const [commentDraft, setCommentDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousRefreshKey = useRef(refreshKey);
  const fetcher = useCallback(async (workspaceId: string): Promise<RequestDiscussion> => {
    if (!workspaceId) return emptyDiscussion;
    const [activity, comments] = await Promise.all([fetchRequestActivity(requestId), fetchRequestComments(requestId)]);
    return { activity, comments };
  }, [requestId]);
  const resource = useWorkspaceResource({ emptyValue: emptyDiscussion, fetcher, resource: `request-discussion:${requestId}`, workspaceId: currentWorkspaceId, enabled: enabled && Boolean(requestId) });
  const { data, error, isLoading, load: refresh, updateData } = resource;
  const refreshNow = useCallback(() => refresh(true), [refresh]);

  useEffect(() => {
    const hasRefreshKeyChanged = previousRefreshKey.current !== refreshKey;
    previousRefreshKey.current = refreshKey;
    if (hasRefreshKeyChanged && enabled && requestId) void refreshNow();
  }, [enabled, refreshKey, refreshNow, requestId]);

  const changeCommentDraft = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setCommentDraft(event.target.value);
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentDraft.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const comment = await createRequestComment(requestId, commentDraft);
      updateData((current) => ({ ...current, comments: [comment, ...current.comments] }));
      setCommentDraft("");
    } catch (error) {
      setSubmitError(getErrorMessage(error, "The comment could not be added. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [commentDraft, isSubmitting, requestId, updateData]);

  return {
    state: { activity: data.activity, comments: data.comments, commentDraft, isLoading, loadError: error ? getErrorMessage(error, "The request history could not be loaded.") : null, submitError, isSubmitting },
    actions: { changeCommentDraft, refresh: refreshNow, submitComment },
  };
}
