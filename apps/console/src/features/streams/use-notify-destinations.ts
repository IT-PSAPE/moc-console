import { useCallback, useMemo } from 'react'
import { fetchTelegramGroups } from '@/data/fetch-telegram-groups'
import { useWorkspace } from '@/lib/workspace-context'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { sameNotifyDestination, type NotifyDestination } from '@moc/types/streams'
import type { DestinationOption } from './notify-destination-field'

function toOptions(groups: Awaited<ReturnType<typeof fetchTelegramGroups>>): DestinationOption[] {
    const options: DestinationOption[] = []
    for (const group of groups) {
        if (!group.active || group.removedAt) continue
        for (const topic of group.topics) {
            if (!topic.closed) options.push({ groupChatId: group.chatId, threadId: topic.threadId, label: `${group.title} › ${topic.name}`, groupTitle: group.title })
        }
    }
    return options
}

export function useNotifyDestinations(value: NotifyDestination[], onChange: (destinations: NotifyDestination[]) => void) {
    const { currentWorkspaceId } = useWorkspace()
    const fetcher = useCallback((workspaceId: string) => fetchTelegramGroups(workspaceId), [])
    const resource = useWorkspaceResource({ emptyValue: [], fetcher, resource: 'telegram-groups', workspaceId: currentWorkspaceId })
    const options = useMemo(() => toOptions(resource.data), [resource.data])
    const selected = useMemo(() => value.map((destination) => options.find((option) => sameNotifyDestination(option, destination))).filter((option): option is DestinationOption => option !== undefined), [options, value])

    function changeDestinations(next: DestinationOption[]) {
        onChange(next.map(({ groupChatId, threadId }) => ({ groupChatId, threadId })))
    }

    const status = resource.error ? 'failed' : resource.isLoading ? 'loading' : 'ready'
    return { state: { options, selected, status }, actions: { changeDestinations } }
}
