import type { Request, Status } from "@/types/requests";
import {
  addOrUpdateRequestAssignee,
  deleteRequestById,
  removeRequestAssigneeByIds,
  updateRequestStatusById,
  upsertRequest,
} from "./mock-request-store";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * ms));

/** Save (insert or update) a request. Returns the persisted request. */
export async function updateRequest(request: Request): Promise<Request> {
  await delay(120);
  return upsertRequest(request);
}

/** Archive a request by setting its status to 'archived' */
export async function archiveRequest(id: string): Promise<void> {
  await delay(100);
  const didUpdate = updateRequestStatusById(id, "archived", new Date().toISOString());
  if (!didUpdate) throw new Error("Request not found");
}

/** Unarchive a request by resetting its status to 'not_started' */
export async function unarchiveRequest(id: string): Promise<void> {
  await delay(100);
  const didUpdate = updateRequestStatusById(id, "not_started", new Date().toISOString());
  if (!didUpdate) throw new Error("Request not found");
}

/** Update just the status of a request */
export async function updateRequestStatus(id: string, status: Status): Promise<void> {
  await delay(100);
  const didUpdate = updateRequestStatusById(id, status, new Date().toISOString());
  if (!didUpdate) throw new Error("Request not found");
}

/** Delete a request (cascades to request_assignees) */
export async function deleteRequest(id: string): Promise<void> {
  await delay(100);
  const didDelete = deleteRequestById(id);
  if (!didDelete) throw new Error("Request not found");
}

/** Add a user to a request with a specific duty */
export async function addRequestAssignee(
  requestId: string,
  userId: string,
  duty: string,
): Promise<void> {
  await delay(100);
  addOrUpdateRequestAssignee(requestId, userId, duty);
}

/** Remove a user from a request */
export async function removeRequestAssignee(
  requestId: string,
  userId: string,
): Promise<void> {
  await delay(100);
  const didRemove = removeRequestAssigneeByIds(requestId, userId);
  if (!didRemove) throw new Error("Request assignee not found");
}
