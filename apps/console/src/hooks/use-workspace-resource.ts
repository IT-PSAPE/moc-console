import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { getWorkspaceResourceState, getWorkspaceResourceVersion, loadWorkspaceResource, setWorkspaceResourceData, updateWorkspaceResourceData } from "@/data/workspace-resource-cache";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceResourceOptions<T> = {
  emptyValue: T;
  fetcher: (workspaceId: string) => Promise<T>;
  resource: string;
  workspaceId: string | null;
};

type WorkspaceSnapshot = {
  generation: number;
  id: string | null;
};

function isSameWorkspace(left: WorkspaceSnapshot, right: WorkspaceSnapshot) {
  return left.id === right.id && left.generation === right.generation;
}

function getSnapshotKey({ generation, id }: WorkspaceSnapshot, resource: string) {
  return `${resource}:${id ?? "none"}:${generation}`;
}

export function useWorkspaceResource<T>({ emptyValue, fetcher, resource, workspaceId }: WorkspaceResourceOptions<T>) {
  const generation = getCurrentWorkspaceGeneration();
  const snapshot = { id: workspaceId, generation };
  const snapshotKey = getSnapshotKey(snapshot, resource);
  const initial = getWorkspaceResourceState<T>(workspaceId, resource);
  const [data, setDataState] = useState<T>(initial.data ?? emptyValue);
  const [error, setError] = useState<Error | null>(initial.error);
  const [isLoading, setIsLoading] = useState(initial.isLoading);
  const [stateSnapshotKey, setStateSnapshotKey] = useState(snapshotKey);
  const currentSnapshotRef = useRef(snapshot);
  const emptyValueRef = useRef(emptyValue);
  currentSnapshotRef.current = snapshot;
  emptyValueRef.current = emptyValue;

  useEffect(() => {
    const cached = getWorkspaceResourceState<T>(workspaceId, resource);
    setDataState(cached.data ?? emptyValueRef.current);
    setError(cached.error);
    setIsLoading(cached.isLoading);
    setStateSnapshotKey(snapshotKey);
  }, [generation, resource, snapshotKey, workspaceId]);

  const load = useCallback(async (force = false) => {
    if (!workspaceId) return;

    const requestedSnapshot = { id: workspaceId, generation };
    const cached = getWorkspaceResourceState<T>(workspaceId, resource);
    const requestedVersion = getWorkspaceResourceVersion(workspaceId, resource);
    setIsLoading(cached.isLoading || !cached.isLoaded || force);
    setError(null);

    try {
      const next = await loadWorkspaceResource(workspaceId, resource, fetcher, force);
      if (isSameWorkspace(currentSnapshotRef.current, requestedSnapshot) && getWorkspaceResourceVersion(workspaceId, resource) === requestedVersion) {
        setDataState(next);
        setError(null);
        setStateSnapshotKey(getSnapshotKey(requestedSnapshot, resource));
      }
    } catch (reason: unknown) {
      const nextError = reason instanceof Error ? reason : new Error("Failed to load workspace data");
      if (isSameWorkspace(currentSnapshotRef.current, requestedSnapshot) && getWorkspaceResourceVersion(workspaceId, resource) === requestedVersion) {
        setError(nextError);
        setStateSnapshotKey(getSnapshotKey(requestedSnapshot, resource));
      }
    } finally {
      if (isSameWorkspace(currentSnapshotRef.current, requestedSnapshot) && getWorkspaceResourceVersion(workspaceId, resource) === requestedVersion) {
        setIsLoading(false);
      }
    }
  }, [fetcher, generation, resource, workspaceId]);

  const setData = useCallback((next: T) => {
    if (!workspaceId) return;

    setWorkspaceResourceData(workspaceId, resource, next);
    setDataState(next);
    setError(null);
    setIsLoading(false);
    setStateSnapshotKey(snapshotKey);
  }, [resource, snapshotKey, workspaceId]);

  const updateData = useCallback((updater: (current: T) => T) => {
    if (!workspaceId) return;

    let next = emptyValueRef.current;
    updateWorkspaceResourceData<T>(workspaceId, resource, (current) => {
      next = updater(current ?? emptyValueRef.current);
      return next;
    });
    setDataState(next);
    setError(null);
    setIsLoading(false);
    setStateSnapshotKey(snapshotKey);
  }, [resource, snapshotKey, workspaceId]);

  const stateIsCurrent = stateSnapshotKey === snapshotKey;
  const visibleData = stateIsCurrent ? data : initial.data ?? emptyValue;
  const visibleError = stateIsCurrent ? error : initial.error;
  const visibleLoading = stateIsCurrent ? isLoading : initial.isLoading;

  return useMemo(() => ({ data: visibleData, error: visibleError, isLoading: visibleLoading, load, setData, updateData }), [load, setData, updateData, visibleData, visibleError, visibleLoading]);
}
