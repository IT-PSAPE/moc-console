import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";
import { notifyChecklistItemAssignment } from "./notify-assignment";

export async function addChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const created = await moc.checklists.addAssignee(checklistItemId, userId, workspaceId);
  if (created) notifyChecklistItemAssignment(checklistItemId, userId);
}

export async function removeChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.checklists.removeAssignee(checklistItemId, userId, workspaceId);
}
