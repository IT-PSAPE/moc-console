import type { Request, Status } from "@moc/types/requests";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchRequests(workspaceId?: string): Promise<Request[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.list(resolvedWorkspaceId);
}

export async function fetchRequestsByStatus(status: Status): Promise<Request[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.listByStatus(status, workspaceId);
}

export async function fetchRequestById(id: string, workspaceId?: string): Promise<Request | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.getById(id, resolvedWorkspaceId);
}

export async function fetchArchivedRequests(workspaceId?: string): Promise<Request[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.listArchived(resolvedWorkspaceId);
}
