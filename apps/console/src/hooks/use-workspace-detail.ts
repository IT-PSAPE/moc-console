import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { useCallback, useEffect, useState } from "react";

type WorkspaceDetailOptions<T> = {
  fetcher: (id: string, workspaceId: string) => Promise<T | undefined>;
  id: string | undefined;
  workspaceId: string | null;
};

type DetailSnapshot = {
  attempt: number;
  generation: number;
  id: string | undefined;
  workspaceId: string | null;
};

type DetailState<T> = {
  data: T | null;
  error: Error | null;
  settledKey: string | null;
};

function getSnapshotKey({ attempt, generation, id, workspaceId }: DetailSnapshot) {
  return `${workspaceId ?? "none"}:${generation}:${id ?? "none"}:${attempt}`;
}

export function useWorkspaceDetail<T>({ fetcher, id, workspaceId }: WorkspaceDetailOptions<T>) {
  const generation = getCurrentWorkspaceGeneration();
  const [attempt, setAttempt] = useState(0);
  const snapshot = { attempt, generation, id, workspaceId };
  const snapshotKey = getSnapshotKey(snapshot);
  const [state, setState] = useState<DetailState<T>>({ data: null, error: null, settledKey: null });

  useEffect(() => {
    if (!id || !workspaceId) return;

    let cancelled = false;
    const requestedSnapshot = { attempt, generation, id, workspaceId };

    void fetcher(id, workspaceId)
      .then((data) => {
        if (cancelled) return;
        setState({ data: data ?? null, error: null, settledKey: getSnapshotKey(requestedSnapshot) });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const error = reason instanceof Error ? reason : new Error("Failed to load this item");
        setState({ data: null, error, settledKey: getSnapshotKey(requestedSnapshot) });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, fetcher, generation, id, workspaceId]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, [setAttempt]);

  const isAvailable = Boolean(id && workspaceId);
  const isCurrent = state.settledKey === snapshotKey;

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    isLoading: isAvailable && !isCurrent,
    retry,
  };
}
