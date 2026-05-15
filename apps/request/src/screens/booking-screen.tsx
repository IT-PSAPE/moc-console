import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Alert } from '@/components/feedback/alert'
import { Spinner } from '@/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { BookingDetails } from '@/features/components/booking-details'
import { EquipmentList } from '@/features/components/equipment-list'
import { BookingReview } from '@/features/components/booking-review'
import { useBookingForm } from '@/features/hooks/use-booking-form'
import { useEquipmentBrowser } from '@/features/hooks/use-equipment-browser'
import { BOOKING_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { ArrowLeft } from 'lucide-react'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar';

export function BookingScreen() {
  const navigate = useNavigate()
  const { state, actions } = useBookingForm()
  const equipment = useEquipmentBrowser(state.data.checkedOutAt, state.data.expectedReturnAt)
  const stepLabels = BOOKING_STEPS.map((s) => s.label)
  const isLastStep = state.step === 3
  const selectedEquipment = equipment.items.filter((item) => state.data.equipmentIds.includes(item.id))

  async function handleNext() {
    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'booking', trackingCode: result.trackingCode } })
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
          <Title.h3>Book Equipment</Title.h3>
          <Paragraph.sm className="text-secondary">Enter your booking details, then select available equipment.</Paragraph.sm>
        </div>
        <div className="shrink-0 w-full max-w-40" />
      </div>

      <div className="w-full max-w-content-sm mx-auto">
        <div className="mt-20 mb-20">
          <StepIndicatorBar currentStep={state.step} totalSteps={3} labels={stepLabels} />
        </div>

        {state.step === 1 && <BookingDetails data={state.data} onChange={actions.setField} />}
        {state.step === 2 && <EquipmentList state={state} equipment={equipment} onToggle={actions.toggleEquipment} />}
        {state.step === 3 && <BookingReview data={state.data} selectedEquipment={selectedEquipment} />}
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
