import type { Workspace, WorkspaceMembership } from "@moc/types/workspace"
import type { MocTransport } from "./transport"

export type WorkspaceDirectory = {
  workspaces: Workspace[]
  memberships: WorkspaceMembership[]
}

export type WorkspaceUpdate = {
  name?: string
  slug?: string
  description?: string | null
}

export function createWorkspacesClient(transport: MocTransport) {
  return {
    directory: () => transport.call<WorkspaceDirectory>("workspaces", "directory"),
    signupWorkspaces: () => transport.call<Workspace[]>("workspaces", "signupWorkspaces"),
    update: (workspaceId: string, updates: WorkspaceUpdate) =>
      transport.call<Workspace>("workspaces", "update", updates, workspaceId),
  }
}
