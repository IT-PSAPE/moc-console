import type { ReactNode } from 'react'
import { Page } from '@moc/ui/components/layout/page'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import { useAuth } from '@/lib/auth-context'
import { AuthLayout } from './auth-layout'

export function AuthSessionGate({ children }: { children: ReactNode }) {
  const { session, loading, restoreError, isRefreshingSession, retrySession } = useAuth()

  if (loading) return <Page.Loading />
  if (!session && restoreError) {
    return <AuthLayout><ResourceLoadError error={restoreError} title="Couldn't check your sign-in status" onRetry={retrySession} /></AuthLayout>
  }

  return <>
    {session && restoreError ? <RetryNotification title="Couldn't check your sign-in status" description="Your work is still here. Retry to check your session." onRetry={retrySession} isRetrying={isRefreshingSession} /> : null}
    {children}
  </>
}
