import { fetchAssigneesByChecklistId, type ResolvedAssignee } from '@moc/data/fetch-assignees'
import { addChecklistItemAssignee, removeChecklistItemAssignee } from '@moc/data/mutate-assignees'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { AssigneeAvatars } from '@/features/assignees/assignee-avatars'
import { MemberPicker } from '@/features/assignees/member-picker'
import { checklistItemDuties, type ChecklistItem } from '@moc/types/cue-sheet'
import { UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function useChecklistAssignees(checklistId: string) {
    const { toast } = useFeedback()
    const [assigneesMap, setAssigneesMap] = useState<Map<string, ResolvedAssignee[]>>(new Map())

    const refresh = useCallback(async () => {
        if (!checklistId) {
            setAssigneesMap(new Map())
            return
        }
        try {
            const next = await fetchAssigneesByChecklistId(checklistId)
            setAssigneesMap(next)
        } catch (error) {
            toast({ title: 'Failed to load assignees', description: getErrorMessage(error, 'Could not load checklist assignees.'), variant: 'error' })
        }
    }, [checklistId, toast])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const handleAdd = useCallback(async (itemId: string, userId: string, duty: string) => {
        try {
            await addChecklistItemAssignee(itemId, userId, duty)
            await refresh()
        } catch (error) {
            toast({ title: 'Failed to add assignee', description: getErrorMessage(error, 'Could not add assignee.'), variant: 'error' })
        }
    }, [refresh, toast])

    const handleRemove = useCallback(async (itemId: string, userId: string) => {
        try {
            await removeChecklistItemAssignee(itemId, userId)
            await refresh()
        } catch (error) {
            toast({ title: 'Failed to remove assignee', description: getErrorMessage(error, 'Could not remove assignee.'), variant: 'error' })
        }
    }, [refresh, toast])

    const renderItemSlot = useMemo(() => {
        return (item: ChecklistItem) => (
            <ChecklistItemAssigneesTrigger
                assignees={assigneesMap.get(item.id) ?? []}
                onAdd={(userId, duty) => { void handleAdd(item.id, userId, duty) }}
                onRemove={(userId) => { void handleRemove(item.id, userId) }}
            />
        )
    }, [assigneesMap, handleAdd, handleRemove])

    return { renderItemSlot, assigneesMap, refresh }
}

type TriggerProps = {
    assignees: ResolvedAssignee[]
    onAdd: (userId: string, duty: string) => void
    onRemove: (userId: string) => void
}

function ChecklistItemAssigneesTrigger({ assignees, onAdd, onRemove }: TriggerProps) {
    return (
        <MemberPicker assignees={assignees} duties={checklistItemDuties} onAdd={onAdd} onRemove={onRemove}>
            <span className="flex items-center gap-1 rounded p-1 cursor-pointer text-quaternary hover:bg-background-primary-hover hover:text-secondary transition-colors">
                {assignees.length > 0 ? (
                    <AssigneeAvatars assignees={assignees} max={2} />
                ) : (
                    <UserPlus className="size-4" />
                )}
            </span>
        </MemberPicker>
    )
}
