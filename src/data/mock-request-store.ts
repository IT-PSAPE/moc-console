import type { Request, RequestAssignee, Status } from "@/types/requests";
import requestAssigneesSeed from "./mock/request-assignees.json";
import requestsSeed from "./mock/requests.json";

const requests = structuredClone(requestsSeed) as Request[];
const requestAssignees = structuredClone(requestAssigneesSeed) as RequestAssignee[];

function cloneRequest(request: Request): Request {
  return structuredClone(request);
}

function cloneAssignee(assignee: RequestAssignee): RequestAssignee {
  return structuredClone(assignee);
}

export function listRequests(): Request[] {
  return requests.map(cloneRequest);
}

export function findRequestById(id: string): Request | undefined {
  const request = requests.find((item) => item.id === id);
  return request ? cloneRequest(request) : undefined;
}

export function listRequestAssigneesByRequestId(requestId: string): RequestAssignee[] {
  return requestAssignees
    .filter((assignee) => assignee.requestId === requestId)
    .map(cloneAssignee);
}

export function upsertRequest(request: Request): Request {
  const nextRequest = cloneRequest(request);
  const existingIndex = requests.findIndex((item) => item.id === nextRequest.id);

  if (existingIndex === -1) {
    requests.push(nextRequest);
    return cloneRequest(nextRequest);
  }

  requests[existingIndex] = nextRequest;
  return cloneRequest(nextRequest);
}

export function updateRequestStatusById(id: string, status: Status, updatedAt: string): boolean {
  const request = requests.find((item) => item.id === id);

  if (!request) {
    return false;
  }

  request.status = status;
  request.updatedAt = updatedAt;
  return true;
}

export function deleteRequestById(id: string): boolean {
  const requestIndex = requests.findIndex((item) => item.id === id);

  if (requestIndex === -1) {
    return false;
  }

  requests.splice(requestIndex, 1);

  for (let index = requestAssignees.length - 1; index >= 0; index -= 1) {
    if (requestAssignees[index].requestId === id) {
      requestAssignees.splice(index, 1);
    }
  }

  return true;
}

export function addOrUpdateRequestAssignee(requestId: string, userId: string, duty: string): void {
  const existingAssignee = requestAssignees.find((assignee) => assignee.requestId === requestId && assignee.userId === userId);

  if (existingAssignee) {
    existingAssignee.duty = duty;
    return;
  }

  requestAssignees.push({ requestId, userId, duty });
}

export function removeRequestAssigneeByIds(requestId: string, userId: string): boolean {
  const assigneeIndex = requestAssignees.findIndex((assignee) => assignee.requestId === requestId && assignee.userId === userId);

  if (assigneeIndex === -1) {
    return false;
  }

  requestAssignees.splice(assigneeIndex, 1);
  return true;
}
