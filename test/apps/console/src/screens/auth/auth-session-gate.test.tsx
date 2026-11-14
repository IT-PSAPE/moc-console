import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, test, vi } from 'vitest'
import type { NotificationProps } from '../../../../../../packages/ui/src/components/feedback/feedback-types'

const retrySession = vi.fn()
const establishedSession = { id: 'session', userId: 'alice' }
const auth = { session: establishedSession, loading: false, restoreError: null as Error | null, isRefreshingSession: false, retrySession }
vi.doMock('../../../../../../apps/console/src/lib/auth-context', () => ({ useAuth: () => auth }))
vi.doMock('../../../../../../packages/ui/src/components/feedback/notification', () => ({
  Notification: function Notification({ title, description, action }: NotificationProps) {
    return <section role="alert"><p>{title}</p><p>{description}</p>{action}</section>
  },
}))
const { AuthSessionGate } = await import('../../../../../../apps/console/src/screens/auth/auth-session-gate')
const { RetryNotification } = await import('../../../../../../packages/ui/src/components/feedback/retry-notification')

beforeEach(() => {
  vi.clearAllMocks()
  auth.restoreError = null
  auth.isRefreshingSession = false
})

test('adds a source-bound retry notice without changing the mounted child slot', () => {
  const children = <input aria-label="Unsaved draft" defaultValue="Keep this work" />
  const healthy = AuthSessionGate({ children })
  auth.restoreError = new Error('Service unavailable')
  const failed = AuthSessionGate({ children })

  expect(healthy.type).toBe(React.Fragment)
  expect(failed.type).toBe(healthy.type)
  expect(failed.props.children[1]).toBe(healthy.props.children[1])
  const notice = failed.props.children[0]
  expect(notice.type).toBe(RetryNotification)
  notice.props.onRetry()
  expect(retrySession).toHaveBeenCalledOnce()
  const markup = renderToStaticMarkup(failed)
  expect(markup).toContain("Couldn&#x27;t check your sign-in status")
  expect(markup).toContain('Unsaved draft')
  expect(markup).toContain('Keep this work')
})

test('marks retry as busy and removes the notice after successful recovery', () => {
  const children = <input aria-label="Unsaved draft" defaultValue="Keep this work" />
  auth.restoreError = new Error('Service unavailable')
  auth.isRefreshingSession = true
  const busy = AuthSessionGate({ children })
  const markup = renderToStaticMarkup(busy)
  expect(markup).toContain('Retrying…')
  expect(markup).toContain('aria-busy="true"')
  expect(markup).toContain('disabled=""')
  expect(markup).toContain('Keep this work')

  auth.restoreError = null
  auth.isRefreshingSession = false
  const recovered = AuthSessionGate({ children })
  expect(recovered.type).toBe(busy.type)
  expect(recovered.props.children[0]).toBeNull()
  expect(recovered.props.children[1]).toBe(busy.props.children[1])
})
