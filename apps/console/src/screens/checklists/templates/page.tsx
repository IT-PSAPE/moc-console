import type { ChangeEvent } from 'react'
import { ListChecks, Plus, Search } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Input } from '@moc/ui/components/form/input'
import { Page } from '@moc/ui/components/layout/page'
import { ChecklistItemCard } from '@/features/checklists/checklist-item'
import { CreateChecklistModal } from '@/features/checklists/create-checklist-modal'
import type { Checklist } from '@moc/types/checklists'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { useChecklistTemplates } from './use-checklist-templates'

export function ChecklistTemplatesScreen() {
    const { state, actions, meta } = useChecklistTemplates()

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        actions.setSearch(event.target.value)
    }

    function renderTemplate(checklist: Checklist) {
        return <ChecklistItemCard key={checklist.id} checklist={checklist} />
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Checklist templates</Page.Title>
                </Page.Heading>
                <Page.Actions>
                    <Button.Icon aria-label="Create checklist template" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
                </Page.Actions>
            </Page.Header>

            <Page.Toolbar>
                <Input aria-label="Search checklist templates" name="checklist-template-search" autoComplete="off" icon={<Search />} placeholder="Search checklist templates…" className="w-full max-w-md" value={state.search} onChange={handleSearchChange} />
            </Page.Toolbar>

            <Page.Content className="flex flex-col gap-1.5">
                <Decision value={meta.templates} loading={meta.isLoading}>
                    <Decision.Loading>
                        <LoadingSpinner className="py-6" />
                    </Decision.Loading>
                    <Decision.Empty>
                        <EmptyState
                            icon={<ListChecks />}
                            title={state.search.trim() ? "No checklist templates match your search" : "No checklist templates yet"}
                            description={state.search.trim() ? "Try a different search term." : "Create a template to standardize recurring preparation steps."}
                        />
                    </Decision.Empty>
                    <Decision.Data>
                        {meta.templates.map(renderTemplate)}
                    </Decision.Data>
                </Decision>
            </Page.Content>

            <CreateChecklistModal open={state.modalOpen} onOpenChange={actions.setModalOpen} onCreate={actions.create} />
        </Page>
    )
}
