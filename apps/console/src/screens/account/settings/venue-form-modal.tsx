import { NameDescriptionDialog } from "@moc/ui/components/overlays/name-description-dialog"
import type { VenueDraft } from "@/data/mutate-venues"
import type { VenueFormTarget } from "./use-venues-settings"
import { useRequestOptionForm } from "./use-request-option-form"

type Props = { target: VenueFormTarget | null; isSaving: boolean; onClose: () => void; onSubmit: (draft: VenueDraft) => void }

export function VenueFormModal({ target, isSaving, onClose, onSubmit }: Props) {
    const initial = target?.mode === "edit" ? target.venue : target?.draft ?? null
    const { state, actions } = useRequestOptionForm(target, initial, onSubmit, onClose)
    return (
        <NameDescriptionDialog open={target !== null} title={target?.mode === "edit" ? "Edit venue" : "New venue"} submitLabel={target?.mode === "edit" ? "Save" : "Add venue"} name={state.form.name} description={state.form.description} canSubmit={state.canSubmit} isSaving={isSaving} onOpenChange={actions.changeOpen} onNameChange={actions.changeName} onDescriptionChange={actions.changeDescription} onSubmit={actions.submit} />
    )
}
