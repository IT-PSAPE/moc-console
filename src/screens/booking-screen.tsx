import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Alert } from '@/components/feedback/alert'
import { Spinner } from '@/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { StepIndicator } from '@/features/components/step-indicator'
import { BookingDetails } from '@/features/components/booking-details'
import { EquipmentList } from '@/features/components/equipment-list'
import { BookingReview } from '@/features/components/booking-review'
import { useBookingForm } from '@/features/hooks/use-booking-form'
import { useEquipmentBrowser } from '@/features/hooks/use-equipment-browser'
import { BOOKING_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'

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
        navigate(routes.publicConfirmation, { state: { type: 'booking', trackingCodes: [result.trackingCode] } })
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
          <Title.h3>Book Equipment</Title.h3>
          <Paragraph.sm className="text-secondary">Enter your booking details, then select available equipment.</Paragraph.sm>
        </div>

        <StepIndicator currentStep={state.step} totalSteps={3} labels={stepLabels} />

        <Divider />

        {state.error && (
          <Alert title="Submission failed" description={state.error} variant="error" style="filled" />
        )}

        {state.step === 1 && (
          <BookingDetails data={state.data} onChange={actions.setField} />
        )}
        {state.step === 2 && (
          <>
            {equipment.error && (
              <Alert title="Failed to load equipment" description={equipment.error} variant="error" style="outline" />
            )}
            <EquipmentList
              items={equipment.items}
              selectedIds={state.data.equipmentIds}
              onToggle={actions.toggleEquipment}
              searchQuery={equipment.searchQuery}
              onSearchChange={equipment.setSearchQuery}
              loading={equipment.loading}
            />
          </>
        )}
        {state.step === 3 && (
          <BookingReview data={state.data} selectedEquipment={selectedEquipment} />
        )}

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
