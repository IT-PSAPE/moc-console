import { moc } from "@/lib/moc-client"
import type { Workspace, WorkspaceMembership } from "@moc/types/workspace"

export type WorkspaceDirectory = {
  workspaces: Workspace[]
  memberships: WorkspaceMembership[]
}

export async function fetchWorkspaceDirectory(): Promise<WorkspaceDirectory> {
  return moc.workspaces.directory()
}
