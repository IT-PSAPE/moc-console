import { deferred, settle } from '../../../../helpers/async'
import type { WorkspaceDirectory } from '../../../../../apps/console/src/data/fetch-workspaces'
import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../broadcast/src/features/test-hook-runtime'

const fetchWorkspaceDirectory = vi.fn<() => Promise<WorkspaceDirectory>>()
const navigate = vi.fn()
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.doMock('../../../../../apps/console/src/lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }))
vi.doMock('../../../../../apps/console/src/data/fetch-workspaces', () => ({ fetchWorkspaceDirectory }))

const { WorkspaceProvider } = await import('../../../../../apps/console/src/lib/workspace-context')
const { clearCurrentWorkspaceCache, getCurrentWorkspaceGeneration } = await import('../../../../../apps/console/src/data/current-workspace')
type WorkspaceValue = ReturnType<typeof import('../../../../../apps/console/src/lib/workspace-context').useWorkspace>
const directory: WorkspaceDirectory = {
  workspaces: [{ id: 'workspace-a', name: 'A', slug: 'a', description: null }],
  memberships: [{ userId: 'alice', workspaceId: 'workspace-a', role: null }],
}



beforeEach(() => { clearCurrentWorkspaceCache(); vi.clearAllMocks() })
afterEach(() => { vi.unstubAllGlobals() })

test('does not restore the workspace mirror after the provider unmounts', async () => {
  const pending = deferred<WorkspaceDirectory>()
  fetchWorkspaceDirectory.mockReturnValueOnce(pending.promise)
  const runtime = new HookRuntime(WorkspaceProvider)
  runtime.render({ children: null })
  runtime.unmount()
  clearCurrentWorkspaceCache()
  const generation = getCurrentWorkspaceGeneration()
  pending.resolve(directory)
  await settle()

  expect(getCurrentWorkspaceGeneration()).toBe(generation)
})

test('an older directory response cannot replace refreshed workspace access', async () => {
  const pending = deferred<WorkspaceDirectory>()
  fetchWorkspaceDirectory.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ workspaces: [], memberships: [] })
  const runtime = new HookRuntime(WorkspaceProvider)
  runtime.render({ children: null })
  const value = runtime.rerender().props.value as WorkspaceValue
  await value.refresh()
  pending.resolve(directory)
  await settle()
  const refreshed = runtime.rerender().props.value as WorkspaceValue

  expect(refreshed.workspaces).toEqual([])
  expect(refreshed.currentWorkspaceId).toBeNull()
  expect(refreshed.loading).toBe(false)
  runtime.unmount()
})


test('keeps workspace request failures distinct from missing membership and recovers on retry', async () => {
  const failure = new Error('Origin not allowed')
  fetchWorkspaceDirectory.mockRejectedValueOnce(failure).mockResolvedValueOnce(directory)
  const runtime = new HookRuntime(WorkspaceProvider)
  runtime.render({ children: null })
  await settle()
  const failed = runtime.rerender().props.value as WorkspaceValue

  expect(failed.error).toBe(failure)
  expect(failed.currentWorkspaceId).toBeNull()
  expect(failed.loading).toBe(false)

  await failed.refresh()
  const recovered = runtime.rerender().props.value as WorkspaceValue
  expect(recovered.error).toBeNull()
  expect(recovered.currentWorkspaceId).toBe('workspace-a')
  expect(recovered.workspaces).toEqual(directory.workspaces)
  runtime.unmount()
})
