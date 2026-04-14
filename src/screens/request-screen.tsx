import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Alert } from '@/components/feedback/alert'
import { Spinner } from '@/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { StepIndicator } from '@/features/components/step-indicator'
import { RequestBasicInfo } from '@/features/components/request-basic-info'
import { RequestDetails } from '@/features/components/request-details'
import { RequestFlow } from '@/features/components/request-flow'
import { RequestReview } from '@/features/components/request-review'
import { useRequestForm } from '@/features/hooks/use-request-form'
import { REQUEST_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'

export function RequestScreen() {
  const navigate = useNavigate()
  const { state, actions } = useRequestForm()
  const stepLabels = REQUEST_STEPS.map((s) => s.label)
  const isLastStep = state.step === 4

  async function handleNext() {
    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'request', trackingCodes: [result.trackingCode] } })
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

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Title.h3>New Request</Title.h3>
          <Paragraph.sm className="text-secondary">Fill in the details for your production request.</Paragraph.sm>
        </div>

        <StepIndicator currentStep={state.step} totalSteps={4} labels={stepLabels} />

        <Divider />

        {state.error && (
          <Alert title="Submission failed" description={state.error} variant="error" style="filled" />
        )}

        {state.step === 1 && <RequestBasicInfo data={state.data} onChange={actions.setField} />}
        {state.step === 2 && <RequestDetails data={state.data} onChange={actions.setField} />}
        {state.step === 3 && <RequestFlow data={state.data} onChange={actions.setField} />}
        {state.step === 4 && <RequestReview data={state.data} />}

        <Divider />

        <div className="flex items-center justify-between">
          <Button variant="ghost" icon={<ArrowLeft />} onClick={handleBack}>
            Back
          </Button>
          <Button
            icon={isLastStep ? (state.submitting ? undefined : <Send />) : <ArrowRight />}
            iconPosition={isLastStep ? 'leading' : 'trailing'}
            onClick={handleNext}
            disabled={!actions.canProceed() || state.submitting}
          >
            {state.submitting ? <Spinner size="sm" /> : isLastStep ? 'Submit' : 'Next'}
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
