import { useEffect, useMemo, useState } from 'react'
import { fetchTelegramGroups } from '@/data/fetch-telegram-groups'
import { useWorkspace } from '@/lib/workspace-context'
import { sameNotifyDestination, type NotifyDestination } from '@moc/types/streams'
import type { DestinationOption } from './notify-destination-field'

type LoadState = {
    workspaceId: string | null
    status: 'loading' | 'ready' | 'failed'
    options: DestinationOption[]
}

function toOptions(groups: Awaited<ReturnType<typeof fetchTelegramGroups>>): DestinationOption[] {
    const options: DestinationOption[] = []
    for (const group of groups) {
        if (!group.active || group.removedAt) continue
        options.push({ groupChatId: group.chatId, threadId: null, label: group.title, groupTitle: group.title })
        for (const topic of group.topics) {
            if (!topic.closed) options.push({ groupChatId: group.chatId, threadId: topic.threadId, label: `${group.title} › ${topic.name}`, groupTitle: group.title })
        }
    }
    return options
}

export function useNotifyDestinations(value: NotifyDestination[], onChange: (destinations: NotifyDestination[]) => void) {
    const { currentWorkspaceId } = useWorkspace()
    const [load, setLoad] = useState<LoadState>({ workspaceId: null, status: 'loading', options: [] })

    if (currentWorkspaceId && load.workspaceId !== currentWorkspaceId) {
        setLoad({ workspaceId: currentWorkspaceId, status: 'loading', options: [] })
    }

    useEffect(() => {
        if (!currentWorkspaceId) return
        let cancelled = false
        fetchTelegramGroups(currentWorkspaceId)
            .then((groups) => {
                if (!cancelled) setLoad((previous) => previous.workspaceId === currentWorkspaceId ? { ...previous, status: 'ready', options: toOptions(groups) } : previous)
            })
            .catch((error: unknown) => {
                console.error('Failed to load Telegram destinations', error)
                if (!cancelled) setLoad((previous) => previous.workspaceId === currentWorkspaceId ? { ...previous, status: 'failed' } : previous)
            })
        return () => { cancelled = true }
    }, [currentWorkspaceId])

    const selected = useMemo(() => value.map((destination) => load.options.find((option) => sameNotifyDestination(option, destination))).filter((option): option is DestinationOption => option !== undefined), [load.options, value])

    function changeDestinations(next: DestinationOption[]) {
        onChange(next.map(({ groupChatId, threadId }) => ({ groupChatId, threadId })))
    }

    return { state: { options: load.options, selected, status: load.status }, actions: { changeDestinations } }
}
