import { FilePlus2, ListChecks, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { Label } from '@moc/ui/components/display/text'
import { Page } from '@moc/ui/components/layout/page'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Input } from '@moc/ui/components/form/input'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { ChecklistItemCard } from '@/features/checklists/checklist-item'
import { ChecklistRunFilterDrawer } from '@/features/checklists/checklist-run-filter-drawer'
import { CreateChecklistRunModal } from '@/features/checklists/create-checklist-run-modal'
import { useChecklistsScreen } from '@/features/checklists/use-checklists-screen'
import type { ChangeEvent } from 'react'
import type { Checklist } from '@moc/types/checklists'

export function ChecklistsScreen() {
    const { state, actions, meta } = useChecklistsScreen()

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        actions.setSearch(event.target.value)
    }

    function renderTemplate(checklist: Checklist) {
        function handleSelect() {
            actions.pickTemplate(checklist)
        }
        return <Dropdown.Item key={checklist.id} onSelect={handleSelect}>{checklist.name}</Dropdown.Item>
    }

    function renderChecklist(checklist: Checklist) {
        return <ChecklistItemCard key={checklist.id} checklist={checklist} />
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Checklists</Page.Title>
                </Page.Heading>
            </Page.Header>

            <Page.Toolbar>
                    <div className="flex flex-1 gap-2 md:justify-end">
                        <Input aria-label="Search checklists" name="checklist-search" autoComplete="off" icon={<Search />} placeholder="Search checklists…" className="w-full max-w-md" value={state.search} onChange={handleSearchChange} />
                        <Drawer mobileSide="bottom">
                            <Drawer.Trigger>
                                {state.isMobile
                                    ? <Button.Icon icon={<Settings2 />} variant="secondary" aria-label="Filter" />
                                    : <Button icon={<Settings2 />} variant="secondary">Filter</Button>}
                            </Drawer.Trigger>
                            <ChecklistRunFilterDrawer filters={meta.filters} />
                        </Drawer>
                        <Dropdown placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon aria-label="Create checklist" variant='secondary' icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                <Dropdown.Item onSelect={actions.pickBlank}>
                                    <FilePlus2 className="size-4" />
                                    Blank checklist
                                </Dropdown.Item>
                                {state.templates.length > 0 && <Dropdown.Separator />}
                                {state.templates.map(renderTemplate)}
                                {state.templates.length > 0 && <Dropdown.Separator />}
                                <Dropdown.Item onSelect={actions.openTemplates}>
                                    <ListChecks className="size-4" />
                                    Manage checklist templates
                                </Dropdown.Item>
                            </Dropdown.Panel>
                        </Dropdown>
                    </div>
            </Page.Toolbar>

            <Page.Content>
                <GroupedList>
                    <GroupedList.Group>
                        <GroupedList.Header>
                            <ListChecks className="size-4" />
                            <Label.sm>Active</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                        <Decision value={state.active} loading={state.isLoading}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<ListChecks />}
                                    title={state.search.trim() ? "No active checklist runs match your search" : "No active checklist runs"}
                                    description={state.search.trim() ? "Try a different search term." : "Start a checklist run to see it here."}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {state.active.map(renderChecklist)}
                            </Decision.Data>
                        </Decision>
                        </GroupedList.Content>
                    </GroupedList.Group>

                    <GroupedList.Group>
                        <GroupedList.Header>
                            <ListChecks className="size-4" />
                            <Label.sm>Completed</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                        <Decision value={state.completed} loading={state.isLoading}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<ListChecks />}
                                    title={state.search.trim() ? "No completed checklist runs match your search" : "No completed checklist runs"}
                                    description={state.search.trim() ? "Try a different search term." : "Completed checklist runs will appear here."}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {state.completed.map(renderChecklist)}
                            </Decision.Data>
                        </Decision>
                        </GroupedList.Content>
                    </GroupedList.Group>
                </GroupedList>
            </Page.Content>

            <CreateChecklistRunModal open={state.modalOpen} onOpenChange={actions.setModalOpen} template={state.modalTemplate} onSubmit={actions.submit} />
        </Page>
    )
}
