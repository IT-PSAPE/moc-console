import { createRequestComment, fetchRequestActivity, fetchRequestComments } from "@/data/request-history";
import { useWorkspace } from "@/lib/workspace-context";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { RequestActivity, RequestComment } from "@moc/types/requests";

export function useRequestDiscussion(requestId: string, enabled = true, refreshKey?: string) {
  const { currentWorkspaceId } = useWorkspace();
  const [activity, setActivity] = useState<RequestActivity[]>([]);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refreshGenerationRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!requestId || !currentWorkspaceId) return;

    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;

    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextActivity, nextComments] = await Promise.all([
        fetchRequestActivity(requestId),
        fetchRequestComments(requestId),
      ]);
      if (refreshGenerationRef.current !== generation) return;
      setActivity(nextActivity);
      setComments(nextComments);
    } catch (error) {
      if (refreshGenerationRef.current !== generation) return;
      setLoadError(getErrorMessage(error, "The request history could not be loaded."));
    } finally {
      if (refreshGenerationRef.current === generation) setIsLoading(false);
    }
  }, [currentWorkspaceId, requestId]);

  useEffect(() => {
    refreshGenerationRef.current += 1;
    setActivity([]);
    setComments([]);
    setLoadError(null);
    setIsLoading(false);
    if (enabled) void refresh();
    return () => {
      refreshGenerationRef.current += 1;
    };
  }, [currentWorkspaceId, enabled, refresh, refreshKey, requestId]);

  const changeCommentDraft = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setCommentDraft(event.target.value);
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentDraft.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const comment = await createRequestComment(requestId, commentDraft);
      setComments((current) => [comment, ...current]);
      setCommentDraft("");
    } catch (error) {
      setSubmitError(getErrorMessage(error, "The comment could not be added. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [commentDraft, isSubmitting, requestId]);

  return {
    state: { activity, comments, commentDraft, isLoading, loadError, submitError, isSubmitting },
    actions: { changeCommentDraft, refresh, submitComment },
  };
}
