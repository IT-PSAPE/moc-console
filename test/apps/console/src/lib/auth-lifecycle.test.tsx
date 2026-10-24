import { deferred, settle } from '../../../../helpers/async'
import type { MoCSession } from '@moc/sdk/auth'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../broadcast/src/features/test-hook-runtime'

const getSession = vi.fn<() => Promise<MoCSession | null>>()
const getProfile = vi.fn(async () => null)
const signOut = vi.fn(async () => ({ error: null }))
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('../../../../../apps/console/src/lib/moc-client', () => ({
  moc: {
    auth: { getSession, signOut }, users: { getProfile }, workspaces: {},
  },
}))

const { AuthProvider } = await import('../../../../../apps/console/src/lib/auth-context')
const { getCurrentWorkspaceId, setCurrentWorkspaceIdMirror, clearCurrentWorkspaceCache } = await import('../../../../../apps/console/src/data/current-workspace')
const { getWorkspaceResourceState, setWorkspaceResourceData } = await import('../../../../../apps/console/src/data/workspace-resource-cache')
type AuthValue = ReturnType<typeof import('../../../../../apps/console/src/lib/auth-context').useAuth>

function session(userId: string): MoCSession {
  return {
    id: `session-${userId}`, userId, expiresAt: '2027-01-01T00:00:00Z',
    user: { id: userId, email: `${userId}@example.com`, name: userId, surname: '', emailVerified: true, image: null },
  }
}

function authValue(runtime: HookRuntime<{ children: React.ReactNode }, React.JSX.Element>): AuthValue {
  return runtime.rerender().props.value as AuthValue
}

describe('authentication lifecycle', () => {
  const runtimes: Array<HookRuntime<{ children: React.ReactNode }, React.JSX.Element>> = []
  let browser: EventTarget

  beforeEach(() => {
    vi.clearAllMocks()
    clearCurrentWorkspaceCache()
    getSession.mockResolvedValue(session('alice'))
    browser = Object.assign(new EventTarget(), { location: new URL('https://console.example.com/login') })
    vi.stubGlobal('window', browser)
    vi.stubGlobal('BroadcastChannel', undefined)
  })

  afterEach(() => {
    for (const runtime of runtimes.splice(0)) runtime.unmount()
    vi.unstubAllGlobals()
  })

  async function mount() {
    const runtime = new HookRuntime(AuthProvider)
    runtimes.push(runtime)
    runtime.render({ children: null })
    await settle()
    return runtime
  }

  test('preserves the selected workspace when focus refreshes the same account', async () => {
    const runtime = await mount()
    setCurrentWorkspaceIdMirror('selected-workspace')
    setWorkspaceResourceData('selected-workspace', 'requests', ['cached'])
    browser.dispatchEvent(new Event('focus'))
    await settle()

    expect(authValue(runtime).user?.id).toBe('alice')
    expect(await getCurrentWorkspaceId()).toBe('selected-workspace')
    expect(getWorkspaceResourceState('selected-workspace', 'requests').data).toEqual(['cached'])
  })

  test('does not restore an in-flight session after signing out', async () => {
    const runtime = await mount()
    const pending = deferred<MoCSession | null>()
    getSession.mockReturnValueOnce(pending.promise)
    browser.dispatchEvent(new Event('focus'))
    await authValue(runtime).signOut()
    pending.resolve(session('alice'))
    await settle()

    expect(authValue(runtime).session).toBeNull()
    expect(authValue(runtime).user).toBeNull()
  })

  test('only applies the latest overlapping session refresh', async () => {
    const runtime = await mount()
    const pending = deferred<MoCSession | null>()
    getSession.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(null)
    browser.dispatchEvent(new Event('focus'))
    browser.dispatchEvent(new Event('focus'))
    await settle()
    pending.resolve(session('alice'))
    await settle()

    expect(authValue(runtime).session).toBeNull()
  })

  test('clears cached workspace resources when the account changes', async () => {
    const runtime = await mount()
    setWorkspaceResourceData('shared-workspace', 'requests', ['alice-only'])
    getSession.mockResolvedValueOnce(session('bob'))
    browser.dispatchEvent(new Event('focus'))
    await settle()

    expect(authValue(runtime).user?.id).toBe('bob')
    expect(getWorkspaceResourceState('shared-workspace', 'requests').data).toBeUndefined()
  })

  test('clears cached workspace resources on sign-out', async () => {
    const runtime = await mount()
    setWorkspaceResourceData('shared-workspace', 'requests', ['private'])
    await authValue(runtime).signOut()

    expect(getWorkspaceResourceState('shared-workspace', 'requests').data).toBeUndefined()
  })
})
