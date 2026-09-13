import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Label } from "@moc/ui/components/display/text"
import type { VenueEventDraft } from "@/data/mutate-venue-events"
import { useVenueEventForm } from "./use-venue-event-form"
import type { VenueEventFormTarget } from "./use-venue-events-settings"

type VenueEventFormModalProps = {
    target: VenueEventFormTarget | null
    isSaving: boolean
    onClose: () => void
    onSubmit: (draft: VenueEventDraft) => void
}

export function VenueEventFormModal({ target, isSaving, onClose, onSubmit }: VenueEventFormModalProps) {
    const { state, actions } = useVenueEventForm(target, onSubmit, onClose)
    const isEdit = target?.mode === "edit"

    return (
        <Modal open={target !== null} onOpenChange={actions.changeOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full md:max-w-md">
                        <Modal.Header>
                            <Label.md>{isEdit ? "Edit event" : "New event"}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input
                                        aria-label="Event name"
                                        name="event-name"
                                        autoComplete="off"
                                        placeholder="e.g. Sunday service"
                                        value={state.form.name}
                                        onChange={actions.changeName}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Description" optional />
                                    <TextArea
                                        aria-label="Event description"
                                        name="event-description"
                                        placeholder="What this event usually involves"
                                        value={state.form.description}
                                        onChange={actions.changeDescription}
                                    />
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={actions.submit} disabled={!state.canSubmit || isSaving}>
                                {isSaving ? "Saving…" : isEdit ? "Save" : "Add event"}
                            </Button>
                        </Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
