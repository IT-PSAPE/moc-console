import { moc } from "@/lib/moc-client"
import type { Workspace } from "@moc/types/workspace"

export type WorkspaceUpdate = {
  name?: string
  slug?: string
  description?: string | null
}

export function updateWorkspace(id: string, updates: WorkspaceUpdate): Promise<Workspace> {
  return moc.workspaces.update(id, updates)
}
