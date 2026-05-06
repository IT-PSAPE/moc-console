import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Dropdown } from '@/components/overlays/dropdown'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Badge } from '@/components/display/badge'
import { Modal } from '@/components/overlays/modal'
import { InlineEditableText } from '@/components/form/inline-editable-text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { ChecklistContent, getChecklistCounts, type AddRequest } from '@/features/cue-sheet/checklist-content'
import { useChecklistAssignees } from '@/features/cue-sheet/use-checklist-assignees'
import { TopBarActions } from '@/features/topbar'
import type { Checklist } from '@/types/cue-sheet'
import { FolderPlus, ListChecks, Plus, SquarePlus, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function CueSheetChecklistDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { checklists },
        actions: { loadChecklists, syncChecklist, removeChecklist },
    } = useCueSheet()
    const { toast } = useFeedback()
    const navigate = useNavigate()

    const checklist = checklists.find((c) => c.id === id) ?? null
    const [addRequest, setAddRequest] = useState<AddRequest>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const { renderItemSlot } = useChecklistAssignees(id ?? '')

    useBreadcrumbOverride(id ?? '', checklist?.name)

    useEffect(() => {
        loadChecklists()
    }, [loadChecklists])

    const handleChecklistUpdate = useCallback(async (nextChecklist: Checklist) => {
        try {
            await syncChecklist(nextChecklist)
        } catch (error) {
            toast({ title: 'Failed to save checklist', description: error instanceof Error ? error.message : 'The checklist could not be saved.', variant: 'error' })
        }
    }, [syncChecklist, toast])

    if (!checklist) {
        return (
            <section className="flex justify-center py-16 mx-auto max-w-content-sm">
                <Spinner size="lg" />
            </section>
        )
    }

    const { total, checked } = getChecklistCounts(checklist)

    async function handleDelete() {
        if (!id) return

        try {
            await removeChecklist(id)
            toast({ title: 'Checklist deleted', variant: 'success' })
            navigate('/cue-sheet/checklist')
        } catch (error) {
            toast({ title: 'Failed to delete checklist', description: error instanceof Error ? error.message : 'The checklist could not be deleted.', variant: 'error' })
        }
    }

    return (
        <section className="mx-auto max-w-content-sm">
            <TopBarActions>
                <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
                <Dropdown placement="bottom">
                    <Dropdown.Trigger>
                        <Button.Icon variant="secondary" icon={<Plus />} />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={() => setAddRequest({ type: 'item', target: 'top' })}>
                            <SquarePlus className="size-4" />
                            Item
                        </Dropdown.Item>
                        <Dropdown.Item onSelect={() => setAddRequest({ type: 'section' })}>
                            <FolderPlus className="size-4" />
                            Section
                        </Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown>
            </TopBarActions>

            <Header className="px-4 pt-12">
                <Header.Lead className="gap-2">
                    <Title.h5>
                        <InlineEditableText value={checklist.name} onSave={(name) => { void handleChecklistUpdate({ ...checklist, name }) }} className="title-h5" />
                    </Title.h5>
                </Header.Lead>
            </Header>

            <div className="px-4 pt-2 flex items-center gap-3">
                <Badge
                    label={`${checked}/${total}`}
                    icon={<ListChecks />}
                    color={checked === total && total > 0 ? 'green' : 'gray'}
                />
                <Paragraph.sm className="text-tertiary">
                    <InlineEditableText value={checklist.description} onSave={(description) => { void handleChecklistUpdate({ ...checklist, description }) }} className="text-sm text-tertiary" placeholder="Add description" />
                </Paragraph.sm>
            </div>

            <Divider className="px-4 my-6" />

            <div className="px-4 pb-8">
                <Label.md className="block pb-4">Items</Label.md>
                <div className="rounded-lg border border-secondary overflow-hidden">
                    <ChecklistContent
                        checklist={checklist}
                        onUpdate={(nextChecklist) => { void handleChecklistUpdate(nextChecklist) }}
                        addRequest={addRequest}
                        onAddRequestDismiss={() => setAddRequest(null)}
                        renderItemSlot={renderItemSlot}
                    />
                </div>
            </div>
            <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Positioner>
                        <Modal.Panel>
                            <Modal.Header>
                                <Label.md>Delete Checklist</Label.md>
                            </Modal.Header>
                            <Modal.Content className="p-4 flex-row gap-4">
                                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                                <Paragraph.sm className="text-secondary">
                                    Are you sure you want to delete this checklist? This action cannot be undone.
                                </Paragraph.sm>
                            </Modal.Content>
                            <Modal.Footer className="justify-end">
                                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleDelete}>Delete Checklist</Button>
                            </Modal.Footer>
                        </Modal.Panel>
                    </Modal.Positioner>
                </Modal.Portal>
            </Modal>
        </section>
    )
}
