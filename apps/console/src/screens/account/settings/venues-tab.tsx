import { Section } from "@moc/ui/components/display/section"
import { Card } from "@moc/ui/components/display/card"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Decision } from "@moc/ui/components/display/decision"
import { Button } from "@moc/ui/components/controls/button"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Building2, Plus } from "lucide-react"
import type { Venue } from "@moc/types/venues"
import { useVenuesSettings } from "./use-venues-settings"
import { VenueRow } from "./venue-row"
import { VenueFormModal } from "./venue-form-modal"

export function VenuesTab() {
    const { state, actions } = useVenuesSettings()

    function renderVenue(venue: Venue) {
        return (
            <VenueRow
                key={venue.id}
                venue={venue}
                pending={state.pendingId === venue.id}
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
                    <Section.Header className="flex-1" title="Venues" description="Manage the venues people can book from the request app." />
                    <Button icon={<Plus />} onClick={actions.openCreate}>Add venue</Button>
                </div>

                <Section.Body className="gap-4">
                    <Decision value={state.venues} loading={state.isLoading}>
                        <Decision.Loading>
                            <LoadingSpinner size="lg" />
                        </Decision.Loading>
                        <Decision.Empty>
                            <EmptyState icon={<Building2 />} title="No venues yet" description="Add a venue so people can book it from the request app." />
                        </Decision.Empty>
                        <Decision.Data>
                            <Card>{state.venues.map(renderVenue)}</Card>
                        </Decision.Data>
                    </Decision>
                </Section.Body>
            </Section>

            <VenueFormModal target={state.formTarget} isSaving={state.isSaving} onClose={actions.closeForm} onSubmit={actions.submitForm} />

            <ConfirmationDialog
                open={state.deleteTarget !== null}
                onOpenChange={handleDeleteOpenChange}
                title="Delete venue?"
                description="This permanently deletes the venue. Venues that have existing bookings can't be deleted — deactivate them instead."
                confirmLabel="Delete venue"
                isConfirming={state.isDeleting}
                onConfirm={actions.confirmDelete}
            />
        </div>
    )
}
