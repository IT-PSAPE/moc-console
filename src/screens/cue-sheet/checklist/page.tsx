import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilePlus2, ListChecks, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { Drawer } from '@/components/overlays/drawer'
import { Dropdown } from '@/components/overlays/dropdown'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { ChecklistRunFilterDrawer } from '@/features/cue-sheet/checklist-run-filter-drawer'
import { CreateChecklistRunModal, type ChecklistRunSubmit } from '@/features/cue-sheet/create-checklist-run-modal'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { partitionChecklistRuns } from '@/features/cue-sheet/run-status'
import { useChecklistRunFilters } from '@/features/cue-sheet/use-checklist-run-filters'
import { routes } from '@/screens/console-routes'
import type { Checklist } from '@/types/cue-sheet'
import { useNavigate } from 'react-router-dom'

export function CueSheetChecklistScreen() {
    const {
        state: { checklists, isLoadingChecklists },
        actions: { loadChecklists, createChecklistInstance, createBlankChecklist },
    } = useCueSheet()
    const navigate = useNavigate()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalTemplate, setModalTemplate] = useState<Checklist | null>(null)

    useEffect(() => {
        loadChecklists()
    }, [loadChecklists])

    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])
    const checklistRuns = useMemo(() => checklists.filter((checklist) => checklist.kind === 'instance'), [checklists])
    const checklistFilters = useChecklistRunFilters(checklistRuns)
    const { filtered, filters, setSearch } = checklistFilters
    const { active: activeChecklistRuns, completed: completedChecklistRuns } = useMemo(() => partitionChecklistRuns(filtered), [filtered])

    const handlePickBlank = useCallback(() => {
        setModalTemplate(null)
        setModalOpen(true)
    }, [])

    const handlePickTemplate = useCallback((template: Checklist) => {
        setModalTemplate(template)
        setModalOpen(true)
    }, [])

    const handleSubmit = useCallback(async (input: ChecklistRunSubmit) => {
        if (input.kind === 'template') {
            await createChecklistInstance(input.template, { name: input.name, description: input.description, scheduledAt: input.scheduledAt })
        } else {
            await createBlankChecklist({ name: input.name, description: input.description, scheduledAt: input.scheduledAt })
        }
    }, [createBlankChecklist, createChecklistInstance])

    const handleOpenTemplates = useCallback(() => {
        navigate(`/${routes.cueSheetTemplates}`)
    }, [navigate])

    return (
        <section>
            <Header className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Checklist Runs</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        View preparation checklist runs created from reusable checklist templates.
                    </Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                    <Header.Lead className="gap-2">
                        <Label.md>Checklists</Label.md>
                    </Header.Lead>
                    <Header.Trail className="gap-2 flex-1 justify-end">
                        <Input icon={<Search />} placeholder="Search checklist runs..." className="w-full max-w-md" value={filters.search} onChange={(event) => setSearch(event.target.value)} />
                        <Drawer>
                            <Drawer.Trigger>
                                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                            </Drawer.Trigger>
                            <ChecklistRunFilterDrawer filters={checklistFilters} />
                        </Drawer>
                        <Dropdown placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant='secondary' icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                <Dropdown.Item onSelect={handlePickBlank}>
                                    <FilePlus2 className="size-4" />
                                    Blank checklist
                                </Dropdown.Item>
                                {checklistTemplates.length > 0 && <Dropdown.Separator />}
                                {checklistTemplates.map((checklist) => (
                                    <Dropdown.Item key={checklist.id} onSelect={() => handlePickTemplate(checklist)}>
                                        {checklist.name}
                                    </Dropdown.Item>
                                ))}
                                {checklistTemplates.length === 0 && (
                                    <Dropdown.Item onSelect={handleOpenTemplates}>
                                        Manage checklist templates
                                    </Dropdown.Item>
                                )}
                            </Dropdown.Panel>
                        </Dropdown>
                    </Header.Trail>
                </Header>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <ListChecks className="size-4" />
                            <Label.sm>All Checklist Runs</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoadingChecklists ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : filtered.length > 0 ? (
                            <>
                                {activeChecklistRuns.length > 0 && (
                                    <>
                                        <Label.sm className="px-4 pt-2 text-tertiary">Active</Label.sm>
                                        {activeChecklistRuns.map((checklist) => (
                                            <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                        ))}
                                    </>
                                )}
                                {completedChecklistRuns.length > 0 && (
                                    <>
                                        <Label.sm className="px-4 pt-4 text-tertiary">Completed</Label.sm>
                                        {completedChecklistRuns.map((checklist) => (
                                            <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <Paragraph.sm className="text-tertiary">No checklist runs match your filters.</Paragraph.sm>
                            </div>
                        )}
                    </Card.Content>
                </Card>
            </div>

            <CreateChecklistRunModal open={modalOpen} onOpenChange={setModalOpen} template={modalTemplate} onSubmit={handleSubmit} />
        </section>
    )
}
