import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Input } from '@/components/form/input'
import { Button } from '@/components/controls/button'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Decision } from '@/components/display/decision'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CreateChecklistModal } from '@/features/cue-sheet/create-checklist-modal'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import type { Checklist } from '@/types/cue-sheet'
import { ListChecks, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function CueSheetChecklistScreen() {
    const {
        state: { checklists, isLoadingChecklists },
        actions: { loadChecklists, syncChecklist },
    } = useCueSheet()

    useEffect(() => {
        loadChecklists()
    }, [loadChecklists])

    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    const filtered = useMemo(() => {
        if (!search.trim()) return checklists
        const q = search.toLowerCase()
        return checklists.filter(
            (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
        )
    }, [checklists, search])

    const handleCreate = useCallback(async ({ name, description }: { name: string; description: string }) => {
        const now = new Date().toISOString()
        const newChecklist: Checklist = {
            id: crypto.randomUUID(),
            name,
            description,
            items: [],
            sections: [],
            createdAt: now,
            updatedAt: now,
        }
        await syncChecklist(newChecklist)
        setShowCreateModal(false)
    }, [syncChecklist])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Checklists</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Preparation checklists for events and services. Click a checklist to view and check off items.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={checklists} loading={isLoadingChecklists}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<ListChecks />}
                        title="No checklists yet"
                        description="Create your first checklist to get started."
                        action={<Button icon={<Plus />} onClick={() => setShowCreateModal(true)}>New Checklist</Button>}
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                            <Header.Lead className="gap-2">
                                <Label.md>All Checklists</Label.md>
                            </Header.Lead>
                            <Header.Trail className="gap-2 flex-1 justify-end">
                                <Input
                                    icon={<Search />}
                                    placeholder="Search checklists..."
                                    className="w-full max-w-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </Header.Trail>
                        </Header.Root>

                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <ListChecks className="size-4" />
                                <Label.sm className='mr-auto'>Checklists</Label.sm>
                                <Button icon={<Plus />} onClick={() => setShowCreateModal(true)}>New Checklist</Button>
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filtered.map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                                {filtered.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No checklists match your search.</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>

            <CreateChecklistModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreate={handleCreate} />
        </section>
    )
}
