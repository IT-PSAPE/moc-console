import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Notification } from '@moc/ui/components/feedback/notification'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { RequestBasicInfo } from '@/features/components/request-basic-info'
import { RequestDetails } from '@/features/components/request-details'
import { RequestFlow } from '@/features/components/request-flow'
import { RequestReview } from '@/features/components/request-review'
import { useRequestForm } from '@/features/hooks/use-request-form'
import { routes } from '@/screens/console-routes'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar';
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import { StepErrorSummary } from '@/features/components/step-error-summary'
import { useRequestCategories } from '@/features/hooks/use-request-categories'
import type { FormEvent } from 'react'
import type { RequestCategoryOption } from '@/types/tracking'

function resolveCategoryName(categories: RequestCategoryOption[], value: string): string {
  return categories.find((category) => category.value === value)?.label ?? value
}

export function RequestScreen() {
  const navigate = useNavigate()
  const categoryOptions = useRequestCategories()
  const { state, actions } = useRequestForm(categoryOptions.state.categories)
  const isLastStep = state.step === 4
  const categoryAvailability = categoryOptions.state.categoryAvailability
  const categoryName = resolveCategoryName(categoryOptions.state.categories, state.data.category)

  async function handleNext() {
    if (categoryAvailability.unavailable) return
    if (!actions.validateCurrentStep()) return

    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'request', trackingCode: result.trackingCode, title: state.data.title } })
      }
    } else {
      actions.nextStep()
    }
  }

  function handleBack() {
    if (state.step === 1) {
      navigate(routes.publicHome)
    } else {
      actions.prevStep()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void handleNext()
  }

  return (
    <PublicLayout className="py-12 portrait:py-8">
      <FlowHeader title="New request" onBack={handleBack} />

      <PublicFlow.Narrow as="form" noValidate onSubmit={handleSubmit}>
        <PublicFlow.Progress>
          <StepIndicatorBar currentStep={state.step} totalSteps={4} />
        </PublicFlow.Progress>

        <StepErrorSummary errors={state.validationErrors} />

        {state.step === 1 && <RequestBasicInfo data={state.data} categories={categoryOptions.state.categories} categoryUnavailable={categoryAvailability.unavailable} categoryPlaceholder={categoryAvailability.placeholder} onChange={actions.setField} errors={state.validationErrors} />}
        {state.step === 2 && <RequestDetails data={state.data} onChange={actions.setField} errors={state.validationErrors} />}
        {state.step === 3 && <RequestFlow data={state.data} onChange={actions.setField} />}
        {state.step === 4 && <RequestReview data={state.data} categoryName={categoryName} />}

        {categoryOptions.state.error && <RetryNotification title="Request categories unavailable" description="Check your connection and try again. Your request details are saved." onRetry={categoryOptions.actions.retry} isRetrying={categoryOptions.state.loading} />}
        {!categoryOptions.state.loading && !categoryOptions.state.error && categoryOptions.state.categories.length === 0 && <Alert title="No request categories are available" description="Ask a workspace manager to add request categories, then reload this page." variant="warning" style="filled" />}
        {state.error && <Notification title="Submission failed" description={state.error} variant="error" />}

        <PublicFlow.Actions>
          <Button type="submit" disabled={state.submitting || categoryAvailability.unavailable} className="rounded-full">
            {state.submitting || categoryOptions.state.loading ? <Spinner size="sm" /> : null}
            {state.submitting ? 'Submitting…' : categoryOptions.state.loading ? 'Loading options…' : isLastStep ? 'Submit' : 'Next'}
          </Button>
        </PublicFlow.Actions>
      </PublicFlow.Narrow>
    </PublicLayout>
  )
}
