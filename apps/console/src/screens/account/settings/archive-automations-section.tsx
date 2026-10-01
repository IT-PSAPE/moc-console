import { Section } from '@moc/ui/components/display/section'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Paragraph } from '@moc/ui/components/display/text'
import { Input } from '@moc/ui/components/form/input'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { useArchiveAutomations } from './use-archive-automations'

export function ArchiveAutomationsSection() {
    const { state, actions } = useArchiveAutomations()
    return (
        <Section>
            <Section.Header title="Auto-archive" description="Keep completed work out of active views after a set number of days." />
            <Section.Body>
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <DividedList>
                        <ListItemCard.Root className="items-center">
                            <ListItemCard.Content>
                                <ListItemCard.Title className="whitespace-normal">Archive completed requests after</ListItemCard.Title>
                            </ListItemCard.Content>
                            <ListItemCard.Trailing className="flex-nowrap">
                                <Input aria-label="Days before archiving completed requests" name="completed-request-days" type="number" min={1} value={state.requestDaysInput} onChange={actions.changeRequestDays} onBlur={actions.saveRequestDays} className="w-20" />
                                <Paragraph.sm className="text-tertiary">days</Paragraph.sm>
                            </ListItemCard.Trailing>
                        </ListItemCard.Root>
                        <ListItemCard.Root className="items-center">
                            <ListItemCard.Content>
                                <ListItemCard.Title className="whitespace-normal">Archive returned bookings after</ListItemCard.Title>
                            </ListItemCard.Content>
                            <ListItemCard.Trailing className="flex-nowrap">
                                <Input aria-label="Days before archiving returned bookings" name="returned-booking-days" type="number" min={1} value={state.bookingDaysInput} onChange={actions.changeBookingDays} onBlur={actions.saveBookingDays} className="w-20" />
                                <Paragraph.sm className="text-tertiary">days</Paragraph.sm>
                            </ListItemCard.Trailing>
                        </ListItemCard.Root>
                    </DividedList>
                )}
            </Section.Body>
        </Section>
    )
}
