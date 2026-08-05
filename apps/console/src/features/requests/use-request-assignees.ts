import { fetchAssigneesByRequestId, type ResolvedAssignee } from "@/data/fetch-assignees";
import { addRequestAssignee, removeRequestAssignee } from "@/data/mutate-requests";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useState } from "react";

export function useRequestAssignees(requestId: string, enabled = true) {
  const { toast } = useFeedback();
  const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      setAssignees(await fetchAssigneesByRequestId(requestId));
    } catch (error) {
      toast({ title: "Failed to load members", description: getErrorMessage(error, "The request members could not be loaded."), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [requestId, toast]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const addMember = useCallback(async (userId: string, duty: string) => {
    try {
      await addRequestAssignee(requestId, userId, duty);
      await refresh();
    } catch (error) {
      toast({ title: "Failed to add member", description: getErrorMessage(error, "The request member could not be added."), variant: "error" });
    }
  }, [refresh, requestId, toast]);

  const removeMember = useCallback(async (userId: string) => {
    try {
      await removeRequestAssignee(requestId, userId);
      await refresh();
    } catch (error) {
      toast({ title: "Failed to remove member", description: getErrorMessage(error, "The request member could not be removed."), variant: "error" });
    }
  }, [refresh, requestId, toast]);

  return {
    state: { assignees, isLoading },
    actions: { addMember, refresh, removeMember },
  };
}
