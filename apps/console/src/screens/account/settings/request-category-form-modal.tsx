import { NameDescriptionDialog } from "@moc/ui/components/overlays/name-description-dialog"
import type { RequestCategoryDraft } from "@/data/mutate-request-categories"
import type { RequestCategoryFormTarget } from "./use-request-categories-settings"
import { useRequestOptionForm } from "./use-request-option-form"

type Props = { target: RequestCategoryFormTarget | null; isSaving: boolean; onClose: () => void; onSubmit: (draft: RequestCategoryDraft) => void }

export function RequestCategoryFormModal({ target, isSaving, onClose, onSubmit }: Props) {
    const initial = target?.mode === "edit" ? target.category : target?.draft ?? null
    const { state, actions } = useRequestOptionForm(target, initial, onSubmit, onClose)
    return (
        <NameDescriptionDialog open={target !== null} title={target?.mode === "edit" ? "Edit category" : "New category"} submitLabel={target?.mode === "edit" ? "Save" : "Add category"} name={state.form.name} description={state.form.description} canSubmit={state.canSubmit} isSaving={isSaving} onOpenChange={actions.changeOpen} onNameChange={actions.changeName} onDescriptionChange={actions.changeDescription} onSubmit={actions.submit} />
    )
}
