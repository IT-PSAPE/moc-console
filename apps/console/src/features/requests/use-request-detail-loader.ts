import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { useCallback, useEffect, useState } from "react";
import { useRequests } from "./request-provider";

type RequestSnapshot = {
  attempt: number;
  generation: number;
  id: string | undefined;
  workspaceId: string | null;
};

function getSnapshotKey({ attempt, generation, id, workspaceId }: RequestSnapshot) {
  return `${workspaceId ?? "none"}:${generation}:${id ?? "none"}:${attempt}`;
}

export function useRequestDetailLoader(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace();
  const { state, actions } = useRequests();
  const { loadRequest, syncRequest } = actions;
  const generation = getCurrentWorkspaceGeneration();
  const [attempt, setAttempt] = useState(0);
  const snapshot = { attempt, generation, id, workspaceId: currentWorkspaceId };
  const snapshotKey = getSnapshotKey(snapshot);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const request = id ? state.requestsById[id] ?? null : null;

  useEffect(() => {
    if (!id || !currentWorkspaceId) return;

    let cancelled = false;
    const requestedSnapshot = { attempt, generation, id, workspaceId: currentWorkspaceId };

    void loadRequest(id)
      .then(() => {
        if (cancelled) return;
        setError(null);
        setSettledKey(getSnapshotKey(requestedSnapshot));
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason : new Error("Failed to load this request"));
        setSettledKey(getSnapshotKey(requestedSnapshot));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, currentWorkspaceId, generation, id, loadRequest]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, [setAttempt]);

  const isCurrent = settledKey === snapshotKey;

  return {
    state: {
      request,
      error: isCurrent ? error : null,
      isLoading: Boolean(!request && id && currentWorkspaceId && !isCurrent),
    },
    actions: { retry, syncRequest },
  };
}
