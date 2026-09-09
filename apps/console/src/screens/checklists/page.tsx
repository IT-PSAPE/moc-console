import { CalendarDays, FilePlus2, List, ListChecks, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { Indicator } from '@moc/ui/components/display/indicator'
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
import { ChecklistCalendarView } from '@/features/checklists/checklist-calendar'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { ChecklistPanelContent } from '@/features/checklists/checklist-drawer-content'
import { CollectionToolbar } from '@moc/ui/components/layout/collection-toolbar'

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
        return <ChecklistItemCard key={checklist.id} checklist={checklist} onSelect={actions.selectChecklist} />
    }

    return (
        <SplitPanel open={state.detailOpen} onOpenChange={actions.closeDetail} detailLabel="Checklist details">
            <SplitPanel.Primary>
            <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Checklists</Page.Title>
                </Page.Heading>
            </Page.Header>

            <CollectionToolbar>
                    <CollectionToolbar.Views>
                        <SegmentedControl value={state.activeView} onValueChange={actions.changeView} fill={state.isMobile}>
                            <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
                            <CollectionToolbar.ViewItem value="calendar" icon={<CalendarDays />}>Calendar</CollectionToolbar.ViewItem>
                        </SegmentedControl>
                    </CollectionToolbar.Views>
                    <CollectionToolbar.Actions>
                        <Input aria-label="Search checklists" name="checklist-search" autoComplete="off" icon={<Search />} placeholder="Search checklists…" className="w-full max-w-md" value={state.search} onChange={handleSearchChange} />
                        <Drawer mobileSide="bottom">
                            <Drawer.Trigger>
                                <CollectionToolbar.ActionButton icon={<Settings2 />} variant="secondary" aria-label="Filter checklists">Filter</CollectionToolbar.ActionButton>
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
                    </CollectionToolbar.Actions>
            </CollectionToolbar>

            <Page.Content>
                {state.activeView === 'calendar' ? (
                    <Decision value={state.activeView} loading={state.isLoading}>
                        <Decision.Loading>
                            <LoadingSpinner className="py-6" />
                        </Decision.Loading>
                        <Decision.Data>
                            <ChecklistCalendarView checklists={meta.calendarFiltered} />
                        </Decision.Data>
                    </Decision>
                ) : (
                <Decision value={meta.filtered} loading={state.isLoading}>
                    <Decision.Loading>
                        <LoadingSpinner className="py-6" />
                    </Decision.Loading>
                    <Decision.Empty>
                        <EmptyState
                            icon={<ListChecks />}
                            title={state.search.trim() ? "No checklist runs match your search" : "No checklist runs"}
                            description={state.search.trim() ? "Try a different search term or clear filters." : "Create a checklist run to see it here."}
                        />
                    </Decision.Empty>
                    <Decision.Data>
                        <GroupedList>
                            {state.showActive && state.active.length > 0 && <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator color="blue" className="size-6" />
                                    <Label.sm>Active</Label.sm>
                                </GroupedList.Header>
                                <GroupedList.Content>{state.active.map(renderChecklist)}</GroupedList.Content>
                            </GroupedList.Group>}

                            {state.showCompleted && state.completed.length > 0 && <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator color="green" className="size-6" />
                                    <Label.sm>Complete</Label.sm>
                                </GroupedList.Header>
                                <GroupedList.Content>{state.completed.map(renderChecklist)}</GroupedList.Content>
                            </GroupedList.Group>}
                        </GroupedList>
                    </Decision.Data>
                </Decision>
                )}
            </Page.Content>

            <CreateChecklistRunModal open={state.modalOpen} onOpenChange={actions.setModalOpen} template={state.modalTemplate} onSubmit={actions.submit} />
            </Page>
            </SplitPanel.Primary>
            <SplitPanel.ResizeHandle />
            <SplitPanel.Detail>
                {state.selectedChecklist && <ChecklistPanelContent checklist={state.selectedChecklist} onClose={actions.closeDetail} />}
            </SplitPanel.Detail>
        </SplitPanel>
    )
}
