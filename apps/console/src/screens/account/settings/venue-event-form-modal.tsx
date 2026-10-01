import { NameDescriptionDialog } from "@moc/ui/components/overlays/name-description-dialog"
import type { VenueEventDraft } from "@/data/mutate-venue-events"
import type { VenueEventFormTarget } from "./use-venue-events-settings"
import { useRequestOptionForm } from "./use-request-option-form"

type Props = { target: VenueEventFormTarget | null; isSaving: boolean; onClose: () => void; onSubmit: (draft: VenueEventDraft) => void }

export function VenueEventFormModal({ target, isSaving, onClose, onSubmit }: Props) {
    const initial = target?.mode === "edit" ? target.event : target?.draft ?? null
    const { state, actions } = useRequestOptionForm(target, initial, onSubmit, onClose)
    return (
        <NameDescriptionDialog open={target !== null} title={target?.mode === "edit" ? "Edit event type" : "New event type"} submitLabel={target?.mode === "edit" ? "Save" : "Add event type"} name={state.form.name} description={state.form.description} canSubmit={state.canSubmit} isSaving={isSaving} onOpenChange={actions.changeOpen} onNameChange={actions.changeName} onDescriptionChange={actions.changeDescription} onSubmit={actions.submit} />
    )
}
