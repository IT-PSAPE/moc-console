import { createContext, useContext } from 'react'
import type { UserWithRole } from '@/data/fetch-users'

type MemberNotificationContextValue = {
    state: Record<string, never>
    actions: { openConnectUser: (user: UserWithRole) => void }
    meta: Record<string, never>
}

export const MemberNotificationContext = createContext<MemberNotificationContextValue | null>(null)

export function useMemberNotifications(): MemberNotificationContextValue {
    const context = useContext(MemberNotificationContext)
    if (!context) throw new Error('Member notifications require a provider')
    return context
}
