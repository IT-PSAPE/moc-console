import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Label } from "@moc/ui/components/display/text"
import type { VenueDraft } from "@/data/mutate-venues"
import { useVenueForm } from "./use-venue-form"
import type { VenueFormTarget } from "./use-venues-settings"

type VenueFormModalProps = {
    target: VenueFormTarget | null
    isSaving: boolean
    onClose: () => void
    onSubmit: (draft: VenueDraft) => void
}

export function VenueFormModal({ target, isSaving, onClose, onSubmit }: VenueFormModalProps) {
    const { state, actions } = useVenueForm(target, onSubmit, onClose)
    const isEdit = target?.mode === "edit"

    return (
        <Modal open={target !== null} onOpenChange={actions.changeOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full md:max-w-md">
                        <Modal.Header>
                            <Label.md>{isEdit ? "Edit venue" : "New venue"}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input
                                        aria-label="Venue name"
                                        name="venue-name"
                                        autoComplete="off"
                                        placeholder="Venue name"
                                        value={state.form.name}
                                        onChange={actions.changeName}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Location" optional />
                                    <Input
                                        aria-label="Venue location"
                                        name="venue-location"
                                        autoComplete="off"
                                        placeholder="Building, floor, room…"
                                        value={state.form.location}
                                        onChange={actions.changeLocation}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Capacity" optional />
                                    <Input
                                        aria-label="Venue capacity"
                                        name="venue-capacity"
                                        type="number"
                                        min={1}
                                        placeholder="Number of people"
                                        value={state.form.capacity}
                                        onChange={actions.changeCapacity}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Notes" optional />
                                    <TextArea
                                        aria-label="Venue notes"
                                        name="venue-notes"
                                        placeholder="Anything worth knowing before booking"
                                        value={state.form.notes}
                                        onChange={actions.changeNotes}
                                    />
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={actions.submit} disabled={!state.canSubmit || isSaving}>
                                {isSaving ? "Saving…" : isEdit ? "Save" : "Add venue"}
                            </Button>
                        </Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
