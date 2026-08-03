import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Input } from '@moc/ui/components/form/input'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { useArchiveAutomations } from './use-archive-automations'

export function ArchiveAutomationsSection() {
    const { state, actions } = useArchiveAutomations()
    return (
        <Section>
            <Section.Header title="Auto-archive" description="Keep completed work out of active views after a set number of days." />
            <Section.Body className="gap-2">
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <>
                        <SettingsRow label="Completed requests" description="Days before archiving.">
                            <Input aria-label="Days before archiving completed requests" name="completed-request-days" type="number" min={1} value={state.requestDaysInput} onChange={actions.changeRequestDays} onBlur={actions.saveRequestDays} className="max-w-32" />
                        </SettingsRow>
                        <SettingsRow label="Returned bookings" description="Days before archiving.">
                            <Input aria-label="Days before archiving returned bookings" name="returned-booking-days" type="number" min={1} value={state.bookingDaysInput} onChange={actions.changeBookingDays} onBlur={actions.saveBookingDays} className="max-w-32" />
                        </SettingsRow>
                    </>
                )}
            </Section.Body>
        </Section>
    )
}
