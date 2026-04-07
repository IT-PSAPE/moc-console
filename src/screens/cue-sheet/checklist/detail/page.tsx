import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Dropdown } from '@/components/overlays/dropdown'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Badge } from '@/components/display/badge'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { ChecklistContent, getChecklistCounts, type AddRequest } from '@/features/cue-sheet/checklist-content'
import { FolderPlus, ListChecks, Plus, SquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export function CueSheetChecklistDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { checklists },
        actions: { loadChecklists, syncChecklist },
    } = useCueSheet()

    const checklist = checklists.find((c) => c.id === id) ?? null
    const [addRequest, setAddRequest] = useState<AddRequest>(null)

    useBreadcrumbOverride(id ?? '', checklist?.name)

    useEffect(() => {
        loadChecklists()
    }, [loadChecklists])

    if (!checklist) {
        return (
            <section className="flex justify-center py-16 mx-auto max-w-content-sm">
                <Spinner size="lg" />
            </section>
        )
    }

    const { total, checked } = getChecklistCounts(checklist)

    return (
        <section className="mx-auto max-w-content-sm">
            <Header.Root className="px-4 pt-12">
                <Header.Lead className="gap-2">
                    <Title.h5>{checklist.name}</Title.h5>
                </Header.Lead>
                <Header.Trail>
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Button variant="secondary" icon={<Plus />} iconOnly />
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
                </Header.Trail>
            </Header.Root>

            <div className="px-4 pt-2 flex items-center gap-3">
                <Badge
                    label={`${checked}/${total}`}
                    icon={<ListChecks />}
                    color={checked === total && total > 0 ? 'green' : 'gray'}
                />
                {checklist.description && (
                    <Paragraph.sm className="text-tertiary">{checklist.description}</Paragraph.sm>
                )}
            </div>

            <Divider className="px-4 my-6" />

            <div className="px-4 pb-8">
                <Label.md className="block pb-4">Items</Label.md>
                <div className="rounded-lg border border-secondary overflow-hidden">
                    <ChecklistContent
                        checklist={checklist}
                        onUpdate={syncChecklist}
                        addRequest={addRequest}
                        onAddRequestDismiss={() => setAddRequest(null)}
                    />
                </div>
            </div>
        </section>
    )
}
