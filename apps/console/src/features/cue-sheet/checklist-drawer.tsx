import { Drawer, useDrawer } from '@moc/ui/components/overlays/drawer'
import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Divider } from '@moc/ui/components/display/divider'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { InlineEditableText } from '@moc/ui/components/form/inline-editable-text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { Checklist } from '@moc/types/cue-sheet'
import { useCueSheet } from './cue-sheet-provider'
import { ChecklistContent, getChecklistCounts, type AddRequest } from './checklist-content'
import { useChecklistAssignees } from './use-checklist-assignees'
import { FolderPlus, Maximize2, Plus, SquarePlus, Trash2, TriangleAlert, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ChecklistDrawer({ checklist }: { checklist: Checklist }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="max-w-lg">
                <ChecklistDrawerContent checklist={checklist} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}

function ChecklistDrawerContent({ checklist }: { checklist: Checklist }) {
    const { actions: drawerActions } = useDrawer()
    const { actions: { syncChecklist, removeChecklist } } = useCueSheet()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const [addRequest, setAddRequest] = useState<AddRequest>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const { renderItemSlot } = useChecklistAssignees(checklist.id)

    const { total, checked } = getChecklistCounts(checklist)

    function handleOpenFullPage() {
        drawerActions.close()
        navigate(`/cue-sheet/checklist/${checklist.id}`)
    }

    const handleChecklistUpdate = useCallback(async (nextChecklist: Checklist) => {
        try {
            await syncChecklist(nextChecklist)
        } catch (error) {
            toast({ title: 'Failed to save checklist', description: error instanceof Error ? error.message : 'The checklist could not be saved.', variant: 'error' })
        }
    }, [syncChecklist, toast])

    async function handleDelete() {
        try {
            await removeChecklist(checklist.id)
            toast({ title: 'Checklist deleted', variant: 'success' })
            setDeleteOpen(false)
            drawerActions.close()
        } catch (error) {
            toast({ title: 'Failed to delete checklist', description: error instanceof Error ? error.message : 'The checklist could not be deleted.', variant: 'error' })
        }
    }

    return (
        <>
            <Drawer.Header className="flex items-center gap-1">
                <Button.Icon variant="ghost" icon={<X />} onClick={drawerActions.close} />
                <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} />
                <div className="flex-1" />
                <Paragraph.sm className="text-tertiary mr-2">{checked}/{total} done</Paragraph.sm>
                <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
            </Drawer.Header>

            <Drawer.Content className="py-4">
                <div className="px-4 pb-2 flex tems-start gap-2">
                    <div className="mr-auto">
                        <Title.h6>
                            <InlineEditableText value={checklist.name} onSave={(name) => { void handleChecklistUpdate({ ...checklist, name }) }} className="title-h6" />
                        </Title.h6>
                        <Paragraph.sm className="text-tertiary pt-1">
                            <InlineEditableText value={checklist.description} onSave={(description) => { void handleChecklistUpdate({ ...checklist, description }) }} className="text-sm text-tertiary" placeholder="Add description" />
                        </Paragraph.sm>
                    </div>
                    <Dropdown placement="bottom">
                        <Dropdown.Trigger>
                            <Button.Icon variant="ghost" icon={<Plus />} />
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
                </div>

                <Divider className="px-4 py-3" />

                <ChecklistContent
                    checklist={checklist}
                    onUpdate={(nextChecklist) => { void handleChecklistUpdate(nextChecklist) }}
                    addRequest={addRequest}
                    onAddRequestDismiss={() => setAddRequest(null)}
                    renderItemSlot={renderItemSlot}
                />
            </Drawer.Content>

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
        </>
    )
}
