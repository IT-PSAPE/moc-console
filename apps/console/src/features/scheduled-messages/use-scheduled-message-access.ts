import { useWorkspace } from '@/lib/workspace-context'

export function useScheduledMessageAccess(): boolean {
    const { role } = useWorkspace()
    return role?.can_update === true
}
