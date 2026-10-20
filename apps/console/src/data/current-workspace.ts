import { MocApiError } from "@moc/sdk"
import { moc } from "@/lib/moc-client"
import { clearWorkspaceResources } from "./workspace-resource-cache"

const fallbackWorkspaceSlug = "default-workspace"

let cachedUserId: string | null = null
let cachedWorkspaceId: string | null = null
let pendingWorkspaceIdPromise: Promise<string> | null = null
let currentWorkspaceIdMirror: string | null = null
let currentWorkspaceGeneration = 0

function requireWorkspaceGeneration(generation: number): void {
  if (generation !== currentWorkspaceGeneration) throw new Error("Workspace changed. Please try again.")
}

async function resolveFallbackWorkspaceId(generation: number): Promise<string> {
  const workspaces = await moc.workspaces.signupWorkspaces()
  requireWorkspaceGeneration(generation)
  const workspace = workspaces.find((candidate) => candidate.slug === fallbackWorkspaceSlug)
  if (!workspace) throw new Error("Default workspace not found")
  return workspace.id
}

export async function getCurrentWorkspaceId(): Promise<string> {
  if (currentWorkspaceIdMirror) return currentWorkspaceIdMirror
  const generation = currentWorkspaceGeneration

  let user: Awaited<ReturnType<typeof moc.users.getProfile>>
  try {
    user = await moc.users.getProfile()
  } catch (error) {
    requireWorkspaceGeneration(generation)
    if (error instanceof MocApiError && error.status === 401) return resolveFallbackWorkspaceId(generation)
    throw error
  }

  requireWorkspaceGeneration(generation)
  if (!user) return resolveFallbackWorkspaceId(generation)
  if (cachedUserId === user.id && cachedWorkspaceId) return cachedWorkspaceId
  if (pendingWorkspaceIdPromise) return pendingWorkspaceIdPromise

  const pending = (async () => {
    try {
      const { memberships } = await moc.workspaces.directory()
      requireWorkspaceGeneration(generation)
      const membership = memberships.find((candidate) => candidate.userId === user.id)
      if (!membership?.workspaceId) throw new Error("Workspace access is pending approval")
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
