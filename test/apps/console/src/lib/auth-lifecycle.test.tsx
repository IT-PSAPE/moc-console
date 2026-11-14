import { deferred, settle } from '../../../../helpers/async'
import type { MoCSession } from '@moc/sdk/auth'
import { MocApiError } from '@moc/sdk/error'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../broadcast/src/features/test-hook-runtime'

const getSession = vi.fn<() => Promise<MoCSession | null>>()
const getProfile = vi.fn(async () => null)
const signOut = vi.fn(async () => ({ error: null }))
const reconcileWebPushOwner = vi.fn<(userId: string | null) => Promise<void>>(async () => undefined)
vi.doMock('../../../../../apps/console/src/data/web-push', () => ({
  reconcileWebPushOwner, disableWebPush: vi.fn(async () => undefined),
}))
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
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    clearCurrentWorkspaceCache()
    getSession.mockResolvedValue(session('alice'))
    browser = Object.assign(new EventTarget(), { location: new URL('https://console.example.com/login') })
    vi.stubGlobal('window', browser)
    vi.stubGlobal('BroadcastChannel', undefined)
  })

  afterEach(() => {
    for (const runtime of runtimes.splice(0)) runtime.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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


  test.each([
    new TypeError('Failed to fetch'),
    new MocApiError('Service unavailable', { status: 502, code: 'unavailable' }),
  ])('keeps established session and workspace data when a refresh fails: %s', async (failure) => {
    const runtime = await mount()
    const established = authValue(runtime).session
    setCurrentWorkspaceIdMirror('selected-workspace')
    setWorkspaceResourceData('selected-workspace', 'requests', ['cached'])
    getSession.mockRejectedValueOnce(failure)
    browser.dispatchEvent(new Event('focus'))
    await settle()

    expect(authValue(runtime).session).toBe(established)
    expect(authValue(runtime).user?.id).toBe('alice')
    expect(authValue(runtime).restoreError).toBe(failure)
    expect(authValue(runtime).loading).toBe(false)
    expect(await getCurrentWorkspaceId()).toBe('selected-workspace')
    expect(getWorkspaceResourceState('selected-workspace', 'requests').data).toEqual(['cached'])
    expect(reconcileWebPushOwner).not.toHaveBeenCalledWith(null)

    browser.dispatchEvent(new Event('focus'))
    await settle()
    expect(authValue(runtime).restoreError).toBeNull()
  })

  test('keeps the session mounted and reports busy while manually retrying a background failure', async () => {
    const runtime = await mount()
    const established = authValue(runtime).session
    getSession.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    browser.dispatchEvent(new Event('focus'))
    await settle()
    const pending = deferred<MoCSession | null>()
    getSession.mockReturnValueOnce(pending.promise)

    authValue(runtime).retrySession()
    expect(authValue(runtime)).toMatchObject({ loading: false, isRefreshingSession: true })
    expect(authValue(runtime).session).toBe(established)
    expect(authValue(runtime).restoreError).toBeInstanceOf(TypeError)
    pending.resolve(session('alice'))
    await settle()

    expect(authValue(runtime)).toMatchObject({ loading: false, isRefreshingSession: false, restoreError: null })
  })

  test('exposes an initial restore failure and recovers through retry', async () => {
    const failure = new TypeError('Failed to fetch')
    getSession.mockRejectedValueOnce(failure)
    const runtime = await mount()

    expect(authValue(runtime)).toMatchObject({ session: null, loading: false, restoreError: failure })
    expect(reconcileWebPushOwner).not.toHaveBeenCalled()
    authValue(runtime).retrySession()
    expect(authValue(runtime).loading).toBe(true)
    await settle()

    expect(authValue(runtime).user?.id).toBe('alice')
    expect(authValue(runtime).loading).toBe(false)
    expect(authValue(runtime).restoreError).toBeNull()
  })

  test.each([401, 403])('expires an established session on explicit HTTP %i rejection', async (status) => {
    const runtime = await mount()
    setWorkspaceResourceData('shared-workspace', 'requests', ['private'])
    getSession.mockRejectedValueOnce(new MocApiError('Not authorized', { status, code: 'unauthorized' }))
    browser.dispatchEvent(new Event('focus'))
    await settle()

    expect(authValue(runtime)).toMatchObject({ session: null, user: null, profile: null, restoreError: null })
    expect(getWorkspaceResourceState('shared-workspace', 'requests').data).toBeUndefined()
    expect(reconcileWebPushOwner).toHaveBeenCalledWith(null)
  })

  test('expires an established session when the server confirms it is absent', async () => {
    const runtime = await mount()
    setWorkspaceResourceData('shared-workspace', 'requests', ['private'])
    getSession.mockResolvedValueOnce(null)
    browser.dispatchEvent(new Event('focus'))
    await settle()

    expect(authValue(runtime).session).toBeNull()
    expect(getWorkspaceResourceState('shared-workspace', 'requests').data).toBeUndefined()
  })

  test('ignores a stale refresh rejection after a newer session succeeds', async () => {
    const runtime = await mount()
    const pending = deferred<MoCSession | null>()
    async function rejectStaleSession(): Promise<MoCSession | null> {
      await pending.promise
      throw new MocApiError('Expired', { status: 401, code: 'unauthorized' })
    }
    getSession.mockReturnValueOnce(rejectStaleSession()).mockResolvedValueOnce(session('bob'))
    browser.dispatchEvent(new Event('focus'))
    browser.dispatchEvent(new Event('focus'))
    await settle()
    pending.resolve(null)
    await settle()

    expect(authValue(runtime).user?.id).toBe('bob')
    expect(authValue(runtime).restoreError).toBeNull()
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
