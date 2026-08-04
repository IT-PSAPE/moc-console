import { fetchRequestRelatedChecklists, type RequestRelatedChecklist } from "@/data/fetch-request-related-checklists";
import { useWorkspace } from "@/lib/workspace-context";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRequestRelatedChecklists(requestId: string, enabled = true) {
  const { currentWorkspaceId } = useWorkspace();
  const [checklists, setChecklists] = useState<RequestRelatedChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshGenerationRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!requestId || !currentWorkspaceId) return;

    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;

    setIsLoading(true);
    setError(null);
    try {
      const nextChecklists = await fetchRequestRelatedChecklists(currentWorkspaceId, requestId);
      if (refreshGenerationRef.current !== generation) return;
      setChecklists(nextChecklists);
    } catch (nextError) {
      if (refreshGenerationRef.current !== generation) return;
      setError(getErrorMessage(nextError, "The related checklists could not be loaded."));
    } finally {
      if (refreshGenerationRef.current === generation) setIsLoading(false);
    }
  }, [currentWorkspaceId, requestId]);

  useEffect(() => {
    refreshGenerationRef.current += 1;
    setChecklists([]);
    setError(null);
    setIsLoading(false);
    if (enabled) void refresh();
    return () => {
      refreshGenerationRef.current += 1;
    };
  }, [currentWorkspaceId, enabled, refresh, requestId]);

  return { state: { checklists, isLoading, error }, actions: { refresh } };
}
