import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { BookingDetails } from '@/features/components/booking-details'
import { BookingEquipmentPicker } from '@/features/components/booking-equipment-picker'
import { BookingReview } from '@/features/components/booking-review'
import { useBookingForm } from '@/features/hooks/use-booking-form'
import { BOOKING_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar';
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'

const bookingStepLabels = BOOKING_STEPS.map((step) => step.label)

export function BookingScreen() {
  const navigate = useNavigate()
  const { state, actions } = useBookingForm()
  const isLastStep = state.step === 3

  async function handleNext() {
    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'booking', trackingCode: result.trackingCode, title: result.title } })
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

  function handleOtherEquipmentChange(text: string) {
    actions.setField('otherEquipment', text)
  }

  return (
    <PublicLayout className="py-8 sm:py-12">
      <FlowHeader title="Book equipment" onBack={handleBack} />

      <PublicFlow>
        <PublicFlow.Progress>
          <StepIndicatorBar currentStep={state.step} totalSteps={3} labels={bookingStepLabels} />
        </PublicFlow.Progress>

        {state.step === 1 && <BookingDetails data={state.data} onChange={actions.setField} />}
        {state.step === 2 && (
          <BookingEquipmentPicker
            selected={state.data.requestedEquipment}
            onToggle={actions.toggleRequestedEquipment}
            otherEquipment={state.data.otherEquipment}
            onOtherChange={handleOtherEquipmentChange}
          />
        )}
        {state.step === 3 && <BookingReview data={state.data} />}
        {state.error && <Alert title="Submission failed" description={state.error} variant="error" style="filled" />}

        <PublicFlow.Actions>
          <Button onClick={handleNext} disabled={!actions.canProceed() || state.submitting} className="rounded-full">
            {state.submitting ? <Spinner size="sm" /> : isLastStep ? 'Submit' : 'Next'}
          </Button>
        </PublicFlow.Actions>
      </PublicFlow>
    </PublicLayout>
  )
}
