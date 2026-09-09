import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { PublicLayout } from '@/features/components/public-layout'
import { VenueBookingDetails } from '@/features/components/venue-booking-details'
import { VenueBookingSchedule } from '@/features/components/venue-booking-schedule'
import { VenueBookingReview } from '@/features/components/venue-booking-review'
import { useVenueBookingForm } from '@/features/hooks/use-venue-booking-form'
import { useVenueAvailability } from '@/features/hooks/use-venue-availability'
import { VENUE_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar'
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import { StepErrorSummary } from '@/features/components/step-error-summary'
import type { FormEvent } from 'react'

const venueStepLabels = VENUE_STEPS.map((step) => step.label)

export function VenueScreen() {
  const navigate = useNavigate()
  const { state, actions } = useVenueBookingForm()
  const availability = useVenueAvailability(state.data.venueId, state.data.bookingDate)
  const isLastStep = state.step === 3

  async function handleNext() {
    if (!actions.validateCurrentStep()) return

    if (isLastStep) {
      const result = await actions.submit()
      if (result) {
        navigate(routes.publicConfirmation, { state: { type: 'venue_booking', trackingCode: result.trackingCode, title: result.title } })
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
      <FlowHeader title="Book a venue" onBack={handleBack} />

      <PublicFlow as="form" noValidate onSubmit={handleSubmit}>
        <PublicFlow.Progress>
          <StepIndicatorBar currentStep={state.step} totalSteps={3} labels={venueStepLabels} />
        </PublicFlow.Progress>

        <StepErrorSummary errors={state.validationErrors} />

        {state.step === 1 && <VenueBookingDetails data={state.data} onChange={actions.setField} errors={state.validationErrors} />}
        {state.step === 2 && (
          <VenueBookingSchedule
            data={state.data}
            venues={availability.state.venues}
            venuesLoading={availability.state.venuesLoading}
            slots={availability.state.slots}
            slotsLoading={availability.state.slotsLoading}
            onVenueChange={actions.setVenue}
            onDateChange={actions.setBookingDate}
            onSlotsChange={actions.setSlots}
            errors={state.validationErrors}
          />
        )}
        {state.step === 3 && (
          <VenueBookingReview data={state.data} venueName={availability.state.selectedVenue?.name ?? ''} bookingWindow={state.bookingWindow} timeZone={availability.state.timeZone} />
        )}

        {state.error && <Alert title="Submission failed" description={state.error} variant="error" style="filled" />}
        {availability.state.venuesError && <Alert title="Could not load venues" description={availability.state.venuesError} variant="error" style="filled" />}
        {availability.state.slotsError && <Alert title="Could not load availability" description={availability.state.slotsError} variant="error" style="filled" />}

        <PublicFlow.Actions>
          <Button type="submit" disabled={state.submitting} className="rounded-full">
            {state.submitting ? <Spinner size="sm" /> : isLastStep ? 'Submit' : 'Next'}
          </Button>
        </PublicFlow.Actions>
      </PublicFlow>
    </PublicLayout>
  )
}
