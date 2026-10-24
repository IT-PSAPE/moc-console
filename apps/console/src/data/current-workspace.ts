import { moc } from "@/lib/moc-client"
import { clearWorkspaceResources } from "./workspace-resource-cache"

let cachedUserId: string | null = null
let cachedWorkspaceId: string | null = null
let pendingWorkspaceIdPromise: Promise<string> | null = null
let currentWorkspaceIdMirror: string | null = null
let currentWorkspaceGeneration = 0

function requireWorkspaceGeneration(generation: number): void {
  if (generation !== currentWorkspaceGeneration) throw new Error("Workspace changed. Please try again.")
}

export async function getCurrentWorkspaceId(): Promise<string> {
  if (currentWorkspaceIdMirror) return currentWorkspaceIdMirror
  const generation = currentWorkspaceGeneration

  let user: Awaited<ReturnType<typeof moc.users.getProfile>>
  try {
    user = await moc.users.getProfile()
  } catch (error) {
    requireWorkspaceGeneration(generation)
    throw error
  }

  requireWorkspaceGeneration(generation)
  if (!user) throw new Error("No authenticated profile was found")
  if (cachedUserId === user.id && cachedWorkspaceId) return cachedWorkspaceId
  if (pendingWorkspaceIdPromise) return pendingWorkspaceIdPromise

  const pending = (async () => {
    try {
      const { memberships } = await moc.workspaces.directory()
      requireWorkspaceGeneration(generation)
      const membership = memberships.find((candidate) => candidate.userId === user.id)
      if (!membership?.workspaceId) throw new Error("No workspace membership was found")
      cachedUserId = user.id
      cachedWorkspaceId = membership.workspaceId
      return membership.workspaceId
    } finally {
      if (generation === currentWorkspaceGeneration) pendingWorkspaceIdPromise = null
    }
  })()
  pendingWorkspaceIdPromise = pending

  return pending
}

export function setCurrentWorkspaceIdMirror(id: string | null) {
  if (currentWorkspaceIdMirror !== id) {
    currentWorkspaceGeneration += 1
    pendingWorkspaceIdPromise = null
  }
  currentWorkspaceIdMirror = id
  if (id) cachedWorkspaceId = id
}

export function getCurrentWorkspaceGeneration() {
  return currentWorkspaceGeneration
}

export function clearCurrentWorkspaceCache() {
  currentWorkspaceGeneration += 1
  cachedUserId = null
  cachedWorkspaceId = null
  pendingWorkspaceIdPromise = null
  setCurrentWorkspaceIdMirror(null)
  clearWorkspaceResources()
}
