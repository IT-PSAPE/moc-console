import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { RequestBasicInfo } from '@/features/components/request-basic-info'
import { RequestDetails } from '@/features/components/request-details'
import { RequestFlow } from '@/features/components/request-flow'
import { RequestReview } from '@/features/components/request-review'
import { useRequestForm } from '@/features/hooks/use-request-form'
import { REQUEST_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar';
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import { StepErrorSummary } from '@/features/components/step-error-summary'
import type { FormEvent } from 'react'

const requestStepLabels = REQUEST_STEPS.map((step) => step.label)

export function RequestScreen() {
  const navigate = useNavigate()
  const { state, actions } = useRequestForm()
  const isLastStep = state.step === 4

  async function handleNext() {
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
    <PublicLayout className="py-8 sm:py-12">
      <FlowHeader title="New request" onBack={handleBack} />

      <PublicFlow as="form" noValidate onSubmit={handleSubmit}>
        <PublicFlow.Progress>
          <StepIndicatorBar currentStep={state.step} totalSteps={4} labels={requestStepLabels} />
        </PublicFlow.Progress>

        <StepErrorSummary errors={state.validationErrors} />

        {state.step === 1 && <RequestBasicInfo data={state.data} onChange={actions.setField} errors={state.validationErrors} />}
        {state.step === 2 && <RequestDetails data={state.data} onChange={actions.setField} errors={state.validationErrors} />}
        {state.step === 3 && <RequestFlow data={state.data} onChange={actions.setField} />}
        {state.step === 4 && <RequestReview data={state.data} />}

        {state.error && <Alert title="Submission failed" description={state.error} variant="error" style="filled" />}

        <PublicFlow.Actions>
          <Button type="submit" disabled={state.submitting} className="rounded-full">
            {state.submitting ? <Spinner size="sm" /> : isLastStep ? 'Submit' : 'Next'}
          </Button>
        </PublicFlow.Actions>
      </PublicFlow>
    </PublicLayout>
  )
}
