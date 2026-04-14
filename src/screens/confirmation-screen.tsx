import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/features/components/public-layout'
import { SubmissionConfirmation } from '@/features/components/submission-confirmation'
import { routes } from '@/screens/console-routes'

type ConfirmationState = {
  type: 'request' | 'booking'
  trackingCodes: string[]
}

export function ConfirmationScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const confirmationState = location.state as ConfirmationState | null

  if (!confirmationState?.trackingCodes?.length) {
    return <Navigate to={routes.publicHome} replace />
  }

  function handleBackToHome() {
    navigate(routes.publicHome)
  }

  return (
    <PublicLayout>
      <SubmissionConfirmation
        trackingCodes={confirmationState.trackingCodes}
        type={confirmationState.type}
        onBackToHome={handleBackToHome}
      />
    </PublicLayout>
  )
}
