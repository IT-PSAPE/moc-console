import { MocApiError } from "@moc/sdk"
import { moc } from "@/lib/moc-client"

const fallbackWorkspaceSlug = "default-workspace"

let cachedUserId: string | null = null
let cachedWorkspaceId: string | null = null
let pendingWorkspaceIdPromise: Promise<string> | null = null
let currentWorkspaceIdMirror: string | null = null
let currentWorkspaceGeneration = 0

async function resolveFallbackWorkspaceId(): Promise<string> {
  const workspaces = await moc.workspaces.signupWorkspaces()
  const workspace = workspaces.find((candidate) => candidate.slug === fallbackWorkspaceSlug)
  if (!workspace) throw new Error("Default workspace not found")
  return workspace.id
}

export async function getCurrentWorkspaceId(): Promise<string> {
  if (currentWorkspaceIdMirror) return currentWorkspaceIdMirror

  let user: Awaited<ReturnType<typeof moc.users.getProfile>>
  try {
    user = await moc.users.getProfile()
  } catch (error) {
    if (error instanceof MocApiError && error.status === 401) return resolveFallbackWorkspaceId()
    throw error
  }

  if (!user) return resolveFallbackWorkspaceId()
  if (cachedUserId === user.id && cachedWorkspaceId) return cachedWorkspaceId
  if (pendingWorkspaceIdPromise) return pendingWorkspaceIdPromise

  pendingWorkspaceIdPromise = (async () => {
    try {
      const { memberships } = await moc.workspaces.directory()
      const membership = memberships.find((candidate) => candidate.userId === user.id)
      if (!membership?.workspaceId) throw new Error("Workspace access is pending approval")
      cachedUserId = user.id
      cachedWorkspaceId = membership.workspaceId
      return membership.workspaceId
    } finally {
      pendingWorkspaceIdPromise = null
    }
  })()

  return pendingWorkspaceIdPromise
}

export function setCurrentWorkspaceIdMirror(id: string | null) {
  if (currentWorkspaceIdMirror !== id) currentWorkspaceGeneration += 1
  currentWorkspaceIdMirror = id
  if (id) cachedWorkspaceId = id
}

export function getCurrentWorkspaceGeneration() {
  return currentWorkspaceGeneration
}

export function clearCurrentWorkspaceCache() {
  cachedUserId = null
  cachedWorkspaceId = null
  pendingWorkspaceIdPromise = null
  setCurrentWorkspaceIdMirror(null)
}
