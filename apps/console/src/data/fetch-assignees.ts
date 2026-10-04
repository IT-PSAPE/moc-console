import { moc } from "@/lib/moc-client"
import type { User } from "@moc/types/requests/assignee"
import { getCurrentWorkspaceId } from "./current-workspace"

// duty is request-only: checklist-item assignment carries no duty label.
export type ResolvedAssignee = User & { duty?: string }

export async function fetchAssigneesByRequestId(requestId: string): Promise<ResolvedAssignee[]> {
  const workspaceId = await getCurrentWorkspaceId()
  return moc.users.requestAssignees(requestId, workspaceId)
}

export async function fetchAssigneesByChecklistId(checklistId: string): Promise<Map<string, ResolvedAssignee[]>> {
  const workspaceId = await getCurrentWorkspaceId()
  const result = await moc.users.checklistAssignees(checklistId, workspaceId)
  return new Map(Object.entries(result))
}

export async function fetchAllUsers(workspaceId?: string): Promise<User[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  return moc.users.all(resolvedWorkspaceId)
}
