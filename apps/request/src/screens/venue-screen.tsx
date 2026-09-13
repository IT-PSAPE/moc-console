import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { VENUE_EVENT_OTHER_ID } from '@moc/types/venues'
import { PublicLayout } from '@/features/components/public-layout'
import { VenueBookingDetails } from '@/features/components/venue-booking-details'
import { VenueBookingReview } from '@/features/components/venue-booking-review'
import { useVenueBookingForm } from '@/features/hooks/use-venue-booking-form'
import { useVenueAvailability } from '@/features/hooks/use-venue-availability'
import { VENUE_STEPS } from '@/features/constants'
import { routes } from '@/screens/console-routes'
import { StepIndicatorBar } from '@/features/components/step-indicator-bar'
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import { StepErrorSummary } from '@/features/components/step-error-summary'
import type { PublicVenueEvent } from '@moc/types/venues'
import type { VenueBookingFormData } from '@/types/venue-booking'
import type { FormEvent } from 'react'

const venueStepLabels = VENUE_STEPS.map((step) => step.label)

// What the booking will be called, resolved the same way the submit RPC
// resolves it: the chosen event's name, or the description typed under
// "Other".
function resolveEventLabel(data: VenueBookingFormData, events: PublicVenueEvent[]): string {
  if (data.eventId === VENUE_EVENT_OTHER_ID) return data.eventOther
  return events.find((event) => event.id === data.eventId)?.name ?? ''
}

export function VenueScreen() {
  const navigate = useNavigate()
  const { state, actions, meta } = useVenueBookingForm()
  const availability = useVenueAvailability(state.data.venueId, state.data.bookingDate)

  async function handleNext() {
    if (!actions.validateCurrentStep()) return

    if (meta.isLastStep) {
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
          <StepIndicatorBar currentStep={state.step} totalSteps={meta.totalSteps} labels={venueStepLabels} />
        </PublicFlow.Progress>

        <StepErrorSummary errors={state.validationErrors} />

        {state.step === 1 && (
          <VenueBookingDetails
            data={state.data}
            venues={availability.state.venues}
            events={availability.state.events}
            listsLoading={availability.state.listsLoading}
            slots={availability.state.slots}
            slotsLoading={availability.state.slotsLoading}
            onChange={actions.setField}
            onVenueChange={actions.setVenue}
            onEventChange={actions.setEvent}
            onDateChange={actions.setBookingDate}
            onSlotsChange={actions.setSlots}
            errors={state.validationErrors}
          />
        )}
        {state.step === 2 && (
          <VenueBookingReview
            data={state.data}
            venueName={availability.state.selectedVenue?.name ?? ''}
            eventLabel={resolveEventLabel(state.data, availability.state.events)}
            bookingWindow={state.bookingWindow}
            timeZone={availability.state.timeZone}
          />
        )}

        {state.error && <Alert title="Submission failed" description={state.error} variant="error" style="filled" />}
        {availability.state.listsError && <Alert title="Could not load venues" description={availability.state.listsError} variant="error" style="filled" />}
        {availability.state.slotsError && <Alert title="Could not load availability" description={availability.state.slotsError} variant="error" style="filled" />}

        <PublicFlow.Actions>
          <Button type="submit" disabled={state.submitting} className="rounded-full">
            {state.submitting ? <Spinner size="sm" /> : meta.isLastStep ? 'Submit' : 'Next'}
          </Button>
        </PublicFlow.Actions>
      </PublicFlow>
    </PublicLayout>
  )
}
