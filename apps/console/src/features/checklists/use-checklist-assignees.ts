import { useCallback, useEffect } from "react";
import { fetchAssigneesByChecklistId, type ResolvedAssignee } from "@/data/fetch-assignees";
import { addChecklistItemAssignee, removeChecklistItemAssignee } from "@/data/mutate-checklist-assignees";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";

const emptyAssigneesMap = new Map<string, ResolvedAssignee[]>();

export function useChecklistAssignees(checklistId: string) {
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useFeedback();
  const fetcher = useCallback((workspaceId: string) => workspaceId ? fetchAssigneesByChecklistId(checklistId) : Promise.resolve(emptyAssigneesMap), [checklistId]);
  const resource = useWorkspaceResource({ emptyValue: emptyAssigneesMap, fetcher, resource: `checklist-assignees:${checklistId}`, workspaceId: currentWorkspaceId, enabled: Boolean(checklistId) });
  const { load, data: assigneesMap, error } = resource;
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (error) toast({ title: "Failed to load assignees", description: getErrorMessage(error, "Could not load checklist assignees."), variant: "error" });
  }, [error, toast]);

  const add = useCallback(async (itemId: string, userId: string) => {
    try {
      await addChecklistItemAssignee(itemId, userId);
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
