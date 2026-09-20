import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Toggle } from "@moc/ui/components/form/toggle"
import { Label } from "@moc/ui/components/display/text"
import type { RequestCategoryDraft } from "@/data/mutate-request-categories"
import { useRequestCategoryForm } from "./use-request-category-form"
import type { RequestCategoryFormTarget } from "./use-request-categories-settings"

type RequestCategoryFormModalProps = {
    target: RequestCategoryFormTarget | null
    isSaving: boolean
    onClose: () => void
    onSubmit: (draft: RequestCategoryDraft) => void
}

export function RequestCategoryFormModal({ target, isSaving, onClose, onSubmit }: RequestCategoryFormModalProps) {
    const { state, actions } = useRequestCategoryForm(target, onSubmit, onClose)
    const isEdit = target?.mode === "edit"

    return (
        <Modal open={target !== null} onOpenChange={actions.changeOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full md:max-w-md">
                        <Modal.Header>
                            <Label.md>{isEdit ? "Edit category" : "New category"}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input
                                        aria-label="Category name"
                                        name="category-name"
                                        autoComplete="off"
                                        placeholder="e.g. Video Production"
                                        value={state.form.name}
                                        onChange={actions.changeName}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Toggle
                                        aria-label="Toggle category active state"
                                        checked={state.form.active}
                                        onChange={actions.changeActive}
                                    >Active</Toggle>
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={actions.submit} disabled={!state.canSubmit || isSaving}>
                                {isSaving ? "Saving…" : isEdit ? "Save" : "Add category"}
                            </Button>
                        </Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
