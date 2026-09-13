import { Section } from "@moc/ui/components/display/section"
import { Card } from "@moc/ui/components/display/card"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Decision } from "@moc/ui/components/display/decision"
import { Button } from "@moc/ui/components/controls/button"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { CalendarHeart, Plus } from "lucide-react"
import type { VenueEvent } from "@moc/types/venues"
import { useVenueEventsSettings } from "./use-venue-events-settings"
import { VenueEventRow } from "./venue-event-row"
import { VenueEventFormModal } from "./venue-event-form-modal"

export function EventsTab() {
    const { state, actions } = useVenueEventsSettings()

    function renderEvent(event: VenueEvent) {
        return (
            <VenueEventRow
                key={event.id}
                event={event}
                pending={state.pendingId === event.id}
                onEdit={actions.openEdit}
                onToggleActive={actions.toggleActive}
                onDelete={actions.openDelete}
            />
        )
    }

    function handleDeleteOpenChange(open: boolean) {
        if (!open) actions.closeDelete()
    }

    return (
        <div className="flex flex-col gap-10">
            <Section>
                <div className="flex items-start justify-between gap-3">
                    <Section.Header className="flex-1" title="Events" description="The events people choose from when booking a venue. Anything not on this list is submitted as “Other”." />
                    <Button icon={<Plus />} onClick={actions.openCreate}>Add event</Button>
                </div>

                <Section.Body className="gap-4">
                    <Decision value={state.events} loading={state.isLoading}>
                        <Decision.Loading>
                            <LoadingSpinner size="lg" />
                        </Decision.Loading>
                        <Decision.Empty>
                            <EmptyState icon={<CalendarHeart />} title="No events yet" description="Add an event so people can pick it when booking a venue." />
                        </Decision.Empty>
                        <Decision.Data>
                            <Card>{state.events.map(renderEvent)}</Card>
                        </Decision.Data>
                    </Decision>
                </Section.Body>
            </Section>

            <VenueEventFormModal target={state.formTarget} isSaving={state.isSaving} onClose={actions.closeForm} onSubmit={actions.submitForm} />

            <ConfirmationDialog
                open={state.deleteTarget !== null}
                onOpenChange={handleDeleteOpenChange}
                title="Delete event?"
                description="This permanently deletes the event. Events that have existing bookings can't be deleted — deactivate them instead."
                confirmLabel="Delete event"
                isConfirming={state.isDeleting}
                onConfirm={actions.confirmDelete}
            />
        </div>
    )
}
