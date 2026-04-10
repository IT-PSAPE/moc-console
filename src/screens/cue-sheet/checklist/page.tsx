import { useCallback, useEffect, useMemo } from 'react'
import { ListChecks, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Decision } from '@/components/display/decision'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { Spinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { Drawer } from '@/components/overlays/drawer'
import { Dropdown } from '@/components/overlays/dropdown'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { ChecklistRunFilterDrawer } from '@/features/cue-sheet/checklist-run-filter-drawer'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { useChecklistRunFilters } from '@/features/cue-sheet/use-checklist-run-filters'
import { routes } from '@/screens/console-routes'
import type { Checklist } from '@/types/cue-sheet'
import { useNavigate } from 'react-router-dom'

export function CueSheetChecklistScreen() {
    const {
        state: { checklists, isLoadingChecklists },
        actions: { loadChecklists, createChecklistInstance },
    } = useCueSheet()
    const navigate = useNavigate()

    useEffect(() => {
        loadChecklists()
    }, [loadChecklists])

    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])
    const checklistRuns = useMemo(() => checklists.filter((checklist) => checklist.kind === 'instance'), [checklists])
    const checklistFilters = useChecklistRunFilters(checklistRuns)
    const { filtered, filters, setSearch } = checklistFilters

    const handleCreateRun = useCallback(async (template: Checklist) => {
        await createChecklistInstance(template)
    }, [createChecklistInstance])

    const handleOpenTemplates = useCallback(() => {
        navigate(`/${routes.cueSheetTemplates}`)
    }, [navigate])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Checklist Runs</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        View preparation checklist runs created from reusable checklist templates.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={checklistRuns} loading={isLoadingChecklists}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<ListChecks />}
                        title="No checklist runs yet"
                        description="Create a run from a template when you need an editable preparation copy."
                        action={
                            <Dropdown.Root placement="bottom">
                                <Dropdown.Trigger>
                                    <Button icon={<Plus />}>Create Run</Button>
                                </Dropdown.Trigger>
                                <Dropdown.Panel>
                                    {checklistTemplates.map((checklist) => (
                                        <Dropdown.Item key={checklist.id} onSelect={() => void handleCreateRun(checklist)}>
                                            {checklist.name}
                                        </Dropdown.Item>
                                    ))}
                                    {checklistTemplates.length === 0 && (
                                        <Dropdown.Item onSelect={handleOpenTemplates}>
                                            Create checklist template
                                        </Dropdown.Item>
                                    )}
                                </Dropdown.Panel>
                            </Dropdown.Root>
                        }
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Card.Root>
                            <Card.Header className="gap-1.5 max-mobile:flex-col *:max-mobile:w-full">
                                <div className="flex flex-1 items-center gap-1.5">
                                    <ListChecks className="size-4" />
                                    <Label.sm>All Checklist Runs</Label.sm>
                                </div>
                                <div className="flex items-center gap-1.5 max-mobile:w-full max-mobile:flex-col">
                                    <Input icon={<Search />} placeholder="Search checklist runs..." className="w-full max-w-sm" value={filters.search} onChange={(event) => setSearch(event.target.value)} />
                                    <Drawer.Root>
                                        <Drawer.Trigger>
                                            <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                                        </Drawer.Trigger>
                                        <ChecklistRunFilterDrawer filters={checklistFilters} />
                                    </Drawer.Root>
                                    <Dropdown.Root placement="bottom">
                                        <Dropdown.Trigger>
                                            <Button.Icon variant='secondary' icon={<Plus />} />
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            {checklistTemplates.map((checklist) => (
                                                <Dropdown.Item key={checklist.id} onSelect={() => void handleCreateRun(checklist)}>
                                                    {checklist.name}
                                                </Dropdown.Item>
                                            ))}
                                            {checklistTemplates.length === 0 && (
                                                <Dropdown.Item onSelect={handleOpenTemplates}>
                                                    Create checklist template
                                                </Dropdown.Item>
                                            )}
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </div>
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filtered.map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                                {filtered.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No checklist runs match your filters.</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>
        </section>
    )
}
