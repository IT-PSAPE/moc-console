import { fetchRequestById, fetchRequests } from "@/data/fetch-requests";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import type { Checklist } from "@moc/types/checklists";
import type { Request } from "@moc/types/requests";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useChecklistRequestLink(checklist: Checklist | null, onUpdate: (checklist: Checklist) => void) {
  const { toast } = useFeedback();
  const { currentWorkspaceId } = useWorkspace();
  const [requests, setRequests] = useState<Request[]>([]);
  const [linkedRequest, setLinkedRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const checklistId = checklist?.id;
  const requestId = checklist?.requestId;
  const isRun = checklist?.kind === "instance";

  useEffect(() => {
    let cancelled = false;
    const workspaceId = currentWorkspaceId;

    if (!checklistId || !workspaceId || !isRun) {
      setRequests([]);
      setLinkedRequest(null);
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    async function load(workspaceId: string) {
      setIsLoading(true);
      setRequests([]);
      setLinkedRequest(null);
      try {
        const [availableRequests, currentRequest] = await Promise.all([
          fetchRequests(workspaceId),
          requestId ? fetchRequestById(requestId, workspaceId) : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        setRequests(availableRequests);
        setLinkedRequest(currentRequest ?? null);
      } catch (error) {
        if (!cancelled) {
          toast({ title: "Failed to load requests", description: error instanceof Error ? error.message : "Requests could not be loaded.", variant: "error" });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load(workspaceId);
    return () => { cancelled = true; };
  }, [checklistId, currentWorkspaceId, isRun, requestId, toast]);

  const requestOptions = useMemo(() => {
    if (!linkedRequest || requests.some((request) => request.id === linkedRequest.id)) return requests;
    return [linkedRequest, ...requests];
  }, [linkedRequest, requests]);

  const link = useCallback((request: Request) => {
    if (!checklist) return;
    onUpdate({ ...checklist, requestId: request.id });
  }, [checklist, onUpdate]);

  const unlink = useCallback(() => {
    if (!checklist) return;
    onUpdate({ ...checklist, requestId: undefined });
  }, [checklist, onUpdate]);

  return { state: { isLoading, linkedRequest, requestOptions }, actions: { link, unlink } };
}
