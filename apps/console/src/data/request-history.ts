import type { RequestActivity, RequestComment } from "@moc/types/requests";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchRequestActivity(requestId: string): Promise<RequestActivity[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.listActivity(requestId, workspaceId);
}

export async function fetchRequestComments(requestId: string): Promise<RequestComment[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.listComments(requestId, workspaceId);
}

export async function createRequestComment(requestId: string, body: string): Promise<RequestComment> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.requests.createComment(requestId, body, workspaceId);
}
