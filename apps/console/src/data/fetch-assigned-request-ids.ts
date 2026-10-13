import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchAssignedRequestIds(workspaceId?: string): Promise<string[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.requests.listAssignedIds(resolvedWorkspaceId);
}
