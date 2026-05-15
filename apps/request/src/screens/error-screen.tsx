import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { PublicLayout } from '@/features/components/public-layout'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Button } from '@moc/ui/components/controls/button'
import { routes } from '@/screens/console-routes'
import { TriangleAlert } from 'lucide-react'

export function ErrorScreen() {
  const error = useRouteError()
  const navigate = useNavigate()

  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred'

  function handleHome() {
    navigate(routes.publicHome)
  }

  function handleRetry() {
    window.location.reload()
  }

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        <EmptyState
          icon={<TriangleAlert />}
          title={isNotFound ? 'Page not found' : 'Something went wrong'}
          description={isNotFound
            ? "The page you're looking for doesn't exist or has been moved."
            : 'An error occurred while loading this page.'
          }
          action={
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleHome}>Back to Home</Button>
              {!isNotFound && <Button variant="ghost" onClick={handleRetry}>Try Again</Button>}
            </div>
          }
        />

        {!isNotFound && (
          <Alert title="Error details" description={message} variant="error" style="outline" />
        )}
      </div>
    </PublicLayout>
  )
}
