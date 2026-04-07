import { Drawer, useDrawer } from '@/components/overlays/drawer'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Dropdown } from '@/components/overlays/dropdown'
import { Paragraph, Title } from '@/components/display/text'
import type { Checklist } from '@/types/cue-sheet'
import { useCueSheet } from './cue-sheet-provider'
import { ChecklistContent, getChecklistCounts, type AddRequest } from './checklist-content'
import { FolderPlus, Maximize2, Plus, SquarePlus, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ChecklistDrawer({ checklist }: { checklist: Checklist }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="!max-w-lg">
                <ChecklistDrawerContent checklist={checklist} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}

function ChecklistDrawerContent({ checklist }: { checklist: Checklist }) {
    const { actions: drawerActions } = useDrawer()
    const { actions: { syncChecklist } } = useCueSheet()
    const navigate = useNavigate()
    const [addRequest, setAddRequest] = useState<AddRequest>(null)

    const { total, checked } = getChecklistCounts(checklist)

    function handleOpenFullPage() {
        drawerActions.close()
        navigate(`/cue-sheet/checklist/${checklist.id}`)
    }

    return (
        <>
            <Drawer.Header className="flex items-center gap-1">
                <Button variant="ghost" icon={<X />} iconOnly onClick={drawerActions.close} />
                <Button variant="ghost" icon={<Maximize2 />} iconOnly onClick={handleOpenFullPage} />
                <div className="flex-1" />
                <Paragraph.sm className="text-tertiary mr-2">{checked}/{total} done</Paragraph.sm>

            </Drawer.Header>

            <Drawer.Content className="py-4">
                <div className="px-4 pb-2 flex tems-start gap-2">
                    <div className="mr-auto">
                        <Title.h6>{checklist.name}</Title.h6>
                        <Paragraph.sm className="text-tertiary pt-1">{checklist.description}</Paragraph.sm>
                    </div>
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Button variant="ghost" icon={<Plus />} iconOnly />
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
                    </Dropdown.Root>
                </div>

                <Divider className="px-4 py-3" />

                <ChecklistContent
                    checklist={checklist}
                    onUpdate={syncChecklist}
                    addRequest={addRequest}
                    onAddRequestDismiss={() => setAddRequest(null)}
                />
            </Drawer.Content>
        </>
    )
}
