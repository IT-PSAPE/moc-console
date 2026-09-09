import { Alert } from '@moc/ui/components/feedback/alert'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'

type StepErrorSummaryProps = {
  errors: StepValidationErrors
}

function getDescription(errors: StepValidationErrors): string {
  return Object.values(errors).join(' ')
}

export function StepErrorSummary({ errors }: StepErrorSummaryProps) {
  if (Object.keys(errors).length === 0) return null

  return <Alert title="Check this step" description={getDescription(errors)} variant="error" style="filled" aria-live="polite" />
}
