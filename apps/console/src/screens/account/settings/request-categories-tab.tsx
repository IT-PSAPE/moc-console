import { Section } from "@moc/ui/components/display/section"
import { Card } from "@moc/ui/components/display/card"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Decision } from "@moc/ui/components/display/decision"
import { Button } from "@moc/ui/components/controls/button"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { ListTree, Plus } from "lucide-react"
import type { RequestCategoryDefinition } from "@moc/types/requests"
import { useRequestCategoriesSettings } from "./use-request-categories-settings"
import { RequestCategoryRow } from "./request-category-row"
import { RequestCategoryFormModal } from "./request-category-form-modal"

export function RequestCategoriesTab() {
    const { state, actions } = useRequestCategoriesSettings()

    function renderCategory(category: RequestCategoryDefinition) {
        return (
            <RequestCategoryRow
                key={category.id}
                category={category}
                pending={state.pendingId === category.id}
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
                    <Section.Header className="flex-1" title="Request categories" description="Manage the categories people can assign to requests." />
                    <Button icon={<Plus />} onClick={actions.openCreate}>Add category</Button>
                </div>

                <Section.Body className="gap-4">
                    <Decision value={state.categories} loading={state.isLoading}>
                        <Decision.Loading>
                            <LoadingSpinner size="lg" />
                        </Decision.Loading>
                        <Decision.Empty>
                            <EmptyState icon={<ListTree />} title="No categories yet" description="Add a category so people can assign it to requests." />
                        </Decision.Empty>
                        <Decision.Data>
                            <Card>{state.categories.map(renderCategory)}</Card>
                        </Decision.Data>
                    </Decision>
                </Section.Body>
            </Section>

            <RequestCategoryFormModal target={state.formTarget} isSaving={state.isSaving} onClose={actions.closeForm} onSubmit={actions.submitForm} />

            <ConfirmationDialog
                open={state.deleteTarget !== null}
                onOpenChange={handleDeleteOpenChange}
                title="Delete category?"
                description="This permanently deletes the category. Categories that have existing requests can't be deleted — deactivate them instead."
                confirmLabel="Delete category"
                isConfirming={state.isDeleting}
                onConfirm={actions.confirmDelete}
            />
        </div>
    )
}
