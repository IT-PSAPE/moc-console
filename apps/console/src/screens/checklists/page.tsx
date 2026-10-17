import { FilePlus2, ListChecks, Plus, Search } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { Indicator } from '@moc/ui/components/display/indicator'
import { Page } from '@moc/ui/components/layout/page'
import { Input } from '@moc/ui/components/form/input'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { ChecklistItemCard } from '@/features/checklists/checklist-item'
import { CreateChecklistRunModal } from '@/features/checklists/create-checklist-run-modal'
import { useChecklistsScreen } from '@/features/checklists/use-checklists-screen'
import type { ChangeEvent } from 'react'
import type { Checklist } from '@moc/types/checklists'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { ChecklistPanelContent } from '@/features/checklists/checklist-drawer-content'

export function ChecklistsScreen() {
    const { state, actions, meta } = useChecklistsScreen()
    if (state.isInitialLoading) return <Page.Loading />;

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
              <Page.Controls>
                <Input aria-label="Search checklists" name="checklist-search" autoComplete="off" icon={<Search />} placeholder="Search checklists…" value={state.search} onChange={handleSearchChange} />
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
              </Page.Controls>
            </Page.Header>

            <Page.Content>
                <Decision value={meta.filtered}>
                    <Decision.Empty>
                        <EmptyState
                            icon={<ListChecks />}
                            title={state.search.trim() ? "No checklist runs match your search" : "No checklist runs"}
                            description={state.search.trim() ? "Try a different search term." : "Create a checklist run to see it here."}
                        />
                    </Decision.Empty>
                    <Decision.Data>
                        <GroupedList>
                            {state.active.length > 0 && <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator.Dot color="blue" className="size-2" />
                                    Active
                                </GroupedList.Header>
                                <GroupedList.Content>{state.active.map(renderChecklist)}</GroupedList.Content>
                            </GroupedList.Group>}

                            {state.completed.length > 0 && <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator.Dot color="green" className="size-2" />
                                    Complete
                                </GroupedList.Header>
                                <GroupedList.Content>{state.completed.map(renderChecklist)}</GroupedList.Content>
                            </GroupedList.Group>}
                        </GroupedList>
                    </Decision.Data>
                </Decision>
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
