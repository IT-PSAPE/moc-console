import { useCallback, useEffect, useState } from "react";
import { fetchAssigneesByChecklistId, type ResolvedAssignee } from "@/data/fetch-assignees";
import { addChecklistItemAssignee, removeChecklistItemAssignee } from "@/data/mutate-checklist-assignees";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";

export function useChecklistAssignees(checklistId: string) {
  const { toast } = useFeedback();
  const [assigneesMap, setAssigneesMap] = useState<Map<string, ResolvedAssignee[]>>(new Map());
  const [trackedChecklistId, setTrackedChecklistId] = useState(checklistId);

  if (trackedChecklistId !== checklistId) {
    setTrackedChecklistId(checklistId);
    setAssigneesMap(new Map());
  }

  const refresh = useCallback(async () => {
    if (!checklistId) return;
    return fetchAssigneesByChecklistId(checklistId).then(setAssigneesMap).catch((error) => {
      toast({ title: "Failed to load assignees", description: getErrorMessage(error, "Could not load checklist assignees."), variant: "error" });
    });
  }, [checklistId, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = useCallback(async (itemId: string, userId: string, duty: string) => {
    try {
      await addChecklistItemAssignee(itemId, userId, duty);
      await refresh();
    } catch (error) {
      toast({ title: "Failed to add assignee", description: getErrorMessage(error, "Could not add assignee."), variant: "error" });
    }
  }, [refresh, toast]);

  const remove = useCallback(async (itemId: string, userId: string) => {
    try {
      await removeChecklistItemAssignee(itemId, userId);
      await refresh();
    } catch (error) {
      toast({ title: "Failed to remove assignee", description: getErrorMessage(error, "Could not remove assignee."), variant: "error" });
    }
  }, [refresh, toast]);

  return { state: { assigneesMap }, actions: { add, refresh, remove } };
}
