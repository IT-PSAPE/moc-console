import { useCallback, useEffect } from "react";
import { fetchAssigneesByRequestId, type ResolvedAssignee } from "@/data/fetch-assignees";
import { addRequestAssignee, removeRequestAssignee } from "@/data/mutate-requests";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";

const emptyAssignees: ResolvedAssignee[] = [];

export function useRequestAssignees(requestId: string, enabled = true) {
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useFeedback();
  const fetcher = useCallback((workspaceId: string) => workspaceId ? fetchAssigneesByRequestId(requestId) : Promise.resolve(emptyAssignees), [requestId]);
  const resource = useWorkspaceResource({ emptyValue: emptyAssignees, fetcher, resource: `request-assignees:${requestId}`, workspaceId: currentWorkspaceId, enabled: enabled && Boolean(requestId) });
  const { load: refresh, data: assignees, error, isLoading } = resource;
  const refreshNow = useCallback(() => refresh(true), [refresh]);

  useEffect(() => {
    if (error) toast({ title: "Failed to load members", description: getErrorMessage(error, "The request members could not be loaded."), variant: "error" });
  }, [error, toast]);

  const addMember = useCallback(async (userId: string, duty: string) => {
    try {
      await addRequestAssignee(requestId, userId, duty);
      await refreshNow();
    } catch (error) {
      toast({ title: "Failed to add member", description: getErrorMessage(error, "The request member could not be added."), variant: "error" });
    }
  }, [refreshNow, requestId, toast]);

  const removeMember = useCallback(async (userId: string) => {
    try {
      await removeRequestAssignee(requestId, userId);
      await refreshNow();
    } catch (error) {
      toast({ title: "Failed to remove member", description: getErrorMessage(error, "The request member could not be removed."), variant: "error" });
    }
  }, [refreshNow, requestId, toast]);

  return {
    state: { assignees, isLoading },
    actions: { addMember, refresh: refreshNow, removeMember },
  };
}
