import { useCallback, useEffect, useMemo, useState } from 'react'
import { randomId } from '@moc/utils/random-id'
import { ListChecks, Plus, Search } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { Card } from '@moc/ui/components/display/card'
import { Header } from '@moc/ui/components/display/header'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Input } from '@moc/ui/components/form/input'
import { ChecklistItemCard } from '@/features/checklists/checklist-item'
import { CreateChecklistModal } from '@/features/checklists/create-checklist-modal'
import { useChecklists } from '@/features/checklists/checklists-provider'
import type { Checklist } from '@moc/types/checklists'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'

export function ChecklistTemplatesScreen() {
    const {
        state: { checklists, isLoadingChecklists },
        actions: { loadChecklists, syncChecklist },
    } = useChecklists()
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        void loadChecklists()
    }, [loadChecklists])

    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])
    const filteredTemplates = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return checklistTemplates
        return checklistTemplates.filter((checklist) => checklist.name.toLowerCase().includes(query) || checklist.description.toLowerCase().includes(query))
    }, [checklistTemplates, search])

    const handleCreateChecklist = useCallback(async ({ name, description }: { name: string; description: string }) => {
        const now = new Date().toISOString()
        const checklist: Checklist = {
            id: randomId(),
            kind: 'template',
            name,
            description,
            items: [],
            sections: [],
            createdAt: now,
            updatedAt: now,
        }
        await syncChecklist(checklist)
        setModalOpen(false)
    }, [syncChecklist])

    function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSearch(event.target.value)
    }

    function handleOpenModal() {
        setModalOpen(true)
    }

    return (
        <section>
            <Header className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Checklist Templates</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Manage reusable checklists for recurring preparation work.
                    </Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                    <Header.Lead className="gap-2">
                        <Label.md>Templates</Label.md>
                    </Header.Lead>
                    <Header.Trail className="gap-2 flex-1 justify-end">
                        <Input icon={<Search />} placeholder="Search checklist templates..." className="w-full max-w-md" value={search} onChange={handleSearchChange} />
                        <Button.Icon variant="secondary" icon={<Plus />} onClick={handleOpenModal} />
                    </Header.Trail>
                </Header>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <ListChecks className="size-4" />
                        <Label.sm>Checklist Templates</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        <Decision value={filteredTemplates} loading={isLoadingChecklists}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<ListChecks />}
                                    title={search.trim() ? "No checklist templates match your search" : "No checklist templates yet"}
                                    description={search.trim() ? "Try a different search term." : "Create a template to standardize recurring preparation steps."}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {filteredTemplates.map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>

            <CreateChecklistModal open={modalOpen} onOpenChange={setModalOpen} onCreate={handleCreateChecklist} />
        </section>
    )
}
