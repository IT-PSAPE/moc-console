import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
export function useScheduledMessageCompose(): void {
    const [params] = useSearchParams()
    const { actions: { startSchedule } } = useScheduledMessagesContext()
    const id = params.get('template') ?? ''
    useEffect(() => { startSchedule(id) }, [id, startSchedule])
}
