import { Paragraph } from '@moc/ui/components/display/text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useCallback } from 'react'
import { MemberSearchPicker } from '@/features/assignees/member-search-picker'
import { fetchAssigneesByCueId, type ResolvedAssignee } from '@/data/fetch-assignees'
import { addCueAssignee, removeCueAssignee } from '@/data/mutate-assignees'
import type { User } from '@moc/types/requests'

// ─── Assignee sections ─────────────────────────────────────────────

type EditSectionProps = {
    cueId: string
    assignees: ResolvedAssignee[]
    isLoading: boolean
    onChange: (next: ResolvedAssignee[]) => void
}

export function EditCueAssigneeSection({ cueId, assignees, isLoading, onChange }: EditSectionProps) {
    const { toast } = useFeedback()

    const handleAdd = useCallback(async (user: User) => {
        try {
            await addCueAssignee(cueId, user.id, '')
            onChange(await fetchAssigneesByCueId(cueId))
        } catch (error) {
            toast({ title: 'Failed to add assignee', description: getErrorMessage(error, 'Could not add cue assignee.'), variant: 'error' })
        }
    }, [cueId, onChange, toast])

    const handleRemove = useCallback(async (userId: string) => {
        try {
            await removeCueAssignee(cueId, userId)
            onChange(await fetchAssigneesByCueId(cueId))
        } catch (error) {
            toast({ title: 'Failed to remove assignee', description: getErrorMessage(error, 'Could not remove cue assignee.'), variant: 'error' })
        }
    }, [cueId, onChange, toast])

    if (isLoading) {
        return <Paragraph.xs className="text-quaternary">Loading…</Paragraph.xs>
    }

    return (
        <MemberSearchPicker
            assignees={assignees}
            onAdd={handleAdd}
            onRemove={handleRemove}
        />
    )
}

type CreateSectionProps = {
    pending: User[]
    onChange: (next: User[]) => void
}

export function CreateCueAssigneeSection({ pending, onChange }: CreateSectionProps) {
    const handleAdd = useCallback((user: User) => {
        onChange([...pending, user])
    }, [onChange, pending])

    const handleRemove = useCallback((userId: string) => {
        onChange(pending.filter((u) => u.id !== userId))
    }, [onChange, pending])

    const pendingAsAssignees: ResolvedAssignee[] = pending.map((user) => ({
        ...user,
        duty: '',
    }))

    return (
        <MemberSearchPicker
            assignees={pendingAsAssignees}
            onAdd={handleAdd}
            onRemove={handleRemove}
        />
    )
}
