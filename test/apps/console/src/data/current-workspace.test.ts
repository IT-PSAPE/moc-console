import { beforeEach, expect, test, vi } from 'vitest'
import { deferred } from '../../../../helpers/async'
import type { User } from '@moc/types/requests/assignee'
import type { WorkspaceDirectory } from '../../../../../apps/console/src/data/fetch-workspaces'

const getProfile = vi.fn<() => Promise<User | null>>()
const directory = vi.fn<() => Promise<WorkspaceDirectory>>()
vi.mock('../../../../../apps/console/src/lib/moc-client', () => ({
  moc: { users: { getProfile: () => getProfile() }, workspaces: { directory: () => directory() } },
}))
const { getCurrentWorkspaceId, clearCurrentWorkspaceCache, setCurrentWorkspaceIdMirror } = await import('../../../../../apps/console/src/data/current-workspace')
const profile: User = { id: 'alice', name: 'Alice', surname: '', email: 'alice@example.com', telegramChatId: null, avatarUrl: null, currentDuty: null, statusMessage: null }
const workspaceDirectory: WorkspaceDirectory = { workspaces: [], memberships: [{ userId: 'alice', workspaceId: 'old-workspace', role: null }] }

beforeEach(() => {
  vi.clearAllMocks(); clearCurrentWorkspaceCache()
  getProfile.mockResolvedValue(profile); directory.mockResolvedValue(workspaceDirectory)
})

test('does not cache an old workspace lookup after sign-out', async () => {
  const pending = deferred<WorkspaceDirectory>()
  directory.mockReturnValueOnce(pending.promise)
  const lookup = getCurrentWorkspaceId()
  const rejected = expect(lookup).rejects.toThrow('Workspace changed')
  await Promise.resolve()
  clearCurrentWorkspaceCache()
  pending.resolve(workspaceDirectory)
  await rejected
})

test('does not return a stale fallback after the selected workspace changes', async () => {
  const pending = deferred<User | null>()
  getProfile.mockReturnValueOnce(pending.promise)
  const lookup = getCurrentWorkspaceId()
  const rejected = expect(lookup).rejects.toThrow('Workspace changed')
  setCurrentWorkspaceIdMirror('selected-workspace')
  pending.resolve(profile)
  await rejected

  expect(await getCurrentWorkspaceId()).toBe('selected-workspace')
})

test('does not resolve an authenticated workspace when no profile exists', async () => {
  getProfile.mockResolvedValueOnce(null)
  await expect(getCurrentWorkspaceId()).rejects.toThrow('No authenticated profile was found')
  expect(directory).not.toHaveBeenCalled()
})

test('does not substitute a default workspace when membership is absent', async () => {
  directory.mockResolvedValueOnce({ workspaces: [], memberships: [] })
  await expect(getCurrentWorkspaceId()).rejects.toThrow('No workspace membership was found')
})
