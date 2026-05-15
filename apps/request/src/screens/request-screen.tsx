import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Alert } from '@/components/feedback/alert'
import { Spinner } from '@/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { RequestBasicInfo } from '@/features/components/request-basic-info'
import { RequestDetails } from '@/features/components/request-details'
import { RequestFlow } from '@/features/components/request-flow'
import { RequestReview } from '@/features/components/request-review'
import { useRequestForm } from '@/features/hooks/use-request-form'
import { REQUEST_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { ArrowLeft } from 'lucide-react'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar';

export function RequestScreen() {
  const navigate = useNavigate()
  const { state, actions } = useRequestForm()
  const stepLabels = REQUEST_STEPS.map((s) => s.label)
  const isLastStep = state.step === 4

  async function handleNext() {
    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'request', trackingCode: result.trackingCode } })
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
    <PublicLayout className="py-16">
      <div className="flex max-mobile:flex-col">
        <div className="shrink-0 w-full max-w-40 mb-8">
          <Button variant="ghost" icon={<ArrowLeft />} onClick={handleBack} className="self-start">Back</Button>
        </div>
        <div className="flex flex-col gap-1 flex-1 text-center">
          <Title.h3>New Request</Title.h3>
          <Paragraph.sm className="text-secondary">Fill in the details for your production request.</Paragraph.sm>
        </div>
        <div className="shrink-0 w-full max-w-40"/>
      </div>

      <div className="w-full max-w-content-sm mx-auto">
        <div className="mt-20 mb-20">
          <StepIndicatorBar currentStep={state.step} totalSteps={4} labels={stepLabels} />
        </div>

        {state.step === 1 && <RequestBasicInfo data={state.data} onChange={actions.setField} />}
        {state.step === 2 && <RequestDetails data={state.data} onChange={actions.setField} />}
        {state.step === 3 && <RequestFlow data={state.data} onChange={actions.setField} />}
        {state.step === 4 && <RequestReview data={state.data} />}

        {state.error && <Alert title="Submission failed" description={state.error} variant="error" style="filled" />}

        <Button
          onClick={handleNext}
          disabled={!actions.canProceed() || state.submitting}
          className="w-full rounded-full px-6 py-3 mt-10"
        >
          {state.submitting ? <Spinner size="sm" /> : isLastStep ? 'Submit' : 'Next'}
        </Button>
      </div>
    </PublicLayout>
  )
}
