import type { Checklist } from "@moc/types/checklists";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchChecklists(workspaceId?: string): Promise<Checklist[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.checklists.list(resolvedWorkspaceId);
}

export async function fetchChecklistById(id: string, workspaceId?: string): Promise<Checklist | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.checklists.getById(id, resolvedWorkspaceId);
}
