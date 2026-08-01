import { Section } from '@moc/ui/components/display/section'
import { Divider } from '@moc/ui/components/display/divider'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Input } from '@moc/ui/components/form/input'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { useArchiveAutomations } from './use-archive-automations'

export function ArchiveAutomationsSection() {
    const { state, actions } = useArchiveAutomations()
    return (
        <Section>
            <Section.Header title="Auto-archive" />
            <Divider className="my-6" />
            <Section.Body>
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <>
                        <SettingsRow label="Completed requests">
                            <Input aria-label="Days before archiving completed requests" name="completed-request-days" type="number" min={1} value={state.requestDaysInput} onChange={actions.changeRequestDays} onBlur={actions.saveRequestDays} className="max-w-32" />
                        </SettingsRow>
                        <Divider className="my-6" />
                        <SettingsRow label="Returned bookings">
                            <Input aria-label="Days before archiving returned bookings" name="returned-booking-days" type="number" min={1} value={state.bookingDaysInput} onChange={actions.changeBookingDays} onBlur={actions.saveBookingDays} className="max-w-32" />
                        </SettingsRow>
                    </>
                )}
            </Section.Body>
        </Section>
    )
}
