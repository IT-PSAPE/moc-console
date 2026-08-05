export type WorkspaceResourceState<T> = {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isLoaded: boolean;
};

type WorkspaceResourceRecord<T> = {
  data: T | undefined;
  error: Error | null;
  promise: Promise<T> | null;
};

const resources = new Map<string, WorkspaceResourceRecord<unknown>>();

function getResourceKey(workspaceId: string, resource: string) {
  return `${workspaceId}:${resource}`;
}

function getRecord<T>(workspaceId: string, resource: string): WorkspaceResourceRecord<T> {
  const key = getResourceKey(workspaceId, resource);
  const existing = resources.get(key) as WorkspaceResourceRecord<T> | undefined;

  if (existing) {
    return existing;
  }

  const record: WorkspaceResourceRecord<T> = { data: undefined, error: null, promise: null };
  resources.set(key, record);
  return record;
}

export function getWorkspaceResourceState<T>(workspaceId: string | null, resource: string): WorkspaceResourceState<T> {
  if (!workspaceId) {
    return { data: undefined, error: null, isLoading: false, isLoaded: false };
  }

  const record = getRecord<T>(workspaceId, resource);
  return { data: record.data, error: record.error, isLoading: record.promise !== null, isLoaded: record.data !== undefined };
}

export async function loadWorkspaceResource<T>(workspaceId: string, resource: string, fetcher: (workspaceId: string) => Promise<T>, force = false): Promise<T> {
  const record = getRecord<T>(workspaceId, resource);

  if (record.promise) {
    return record.promise;
  }

  if (!force && record.data !== undefined) {
    return record.data;
  }

  record.error = null;
  record.promise = fetcher(workspaceId)
    .then((data) => {
      record.data = data;
      return data;
    })
    .catch((error: unknown) => {
      const resourceError = error instanceof Error ? error : new Error("Failed to load workspace data");
      record.error = resourceError;
      throw resourceError;
    })
    .finally(() => {
      record.promise = null;
    });

  return record.promise;
}

export function setWorkspaceResourceData<T>(workspaceId: string, resource: string, data: T) {
  const record = getRecord<T>(workspaceId, resource);
  record.data = data;
  record.error = null;
}

export function updateWorkspaceResourceData<T>(workspaceId: string, resource: string, updater: (current: T | undefined) => T | undefined) {
  const record = getRecord<T>(workspaceId, resource);
  record.data = updater(record.data);
  record.error = null;
}

export function invalidateWorkspaceResource(workspaceId: string, resource: string) {
  const record = getRecord(workspaceId, resource);
  record.data = undefined;
}
