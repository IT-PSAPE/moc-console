import { moc } from "@/lib/moc-client";

export type RequestRelatedChecklist = {
  id: string;
  name: string;
  completedItems: number;
  totalItems: number;
};

export async function fetchRequestRelatedChecklists(workspaceId: string, requestId: string): Promise<RequestRelatedChecklist[]> {
  return moc.checklists.getRelatedToRequest(workspaceId, requestId);
}
