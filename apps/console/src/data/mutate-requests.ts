import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";
import { notifyRequestAssignment } from "./notify-assignment";
import { notifyEntityChanged } from "./notify-event";
import type { Request, Status } from "@moc/types/requests";

export async function updateRequest(request: Request): Promise<Request> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.save(request, workspaceId);
}

export async function archiveRequest(id: string): Promise<void> {
  await updateRequestStatus(id, "archived");
}

export async function unarchiveRequest(id: string): Promise<void> {
  await updateRequestStatus(id, "not_started");
}

export async function updateRequestStatus(id: string, status: Status): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.requests.setStatus(id, status, workspaceId);
  notifyEntityChanged("request", id);
}

export async function deleteRequest(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.requests.delete(id, workspaceId);
}

export async function addRequestAssignee(requestId: string, userId: string, duty: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const changed = await moc.requests.addAssignee(requestId, userId, duty, workspaceId);
  if (changed) notifyRequestAssignment(requestId, userId, duty);
}

export async function removeRequestAssignee(requestId: string, userId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.requests.removeAssignee(requestId, userId, workspaceId);
}
