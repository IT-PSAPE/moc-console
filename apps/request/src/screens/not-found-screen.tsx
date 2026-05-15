import { useNavigate } from 'react-router-dom'
import { PublicLayout } from '@/features/components/public-layout'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Button } from '@moc/ui/components/controls/button'
import { routes } from '@/screens/console-routes'
import { FileQuestion } from 'lucide-react'

export function NotFoundScreen() {
  const navigate = useNavigate()

  function handleHome() {
    navigate(routes.publicHome)
  }

  return (
    <PublicLayout>
      <EmptyState
        icon={<FileQuestion />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={<Button variant="secondary" onClick={handleHome}>Back to Home</Button>}
      />
    </PublicLayout>
  )
}
