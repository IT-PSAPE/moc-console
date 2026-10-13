import type { ReactNode } from 'react'
import { AppNavigationContext } from './app-navigation-context'
import { useAppNavigation } from './use-app-navigation'

type AppNavigationRootProps = {
    children: ReactNode
    isSigningOut: boolean
    canManageScheduledMessages: boolean
    onCloseMobileNavigation: () => void
    onEditProfile: () => void
    onSignOut: () => void
}

export function AppNavigationRoot({ children, isSigningOut, canManageScheduledMessages, onCloseMobileNavigation, onEditProfile, onSignOut }: AppNavigationRootProps) {
    const navigation = useAppNavigation(canManageScheduledMessages)
    const value = {
        ...navigation,
        actions: { ...navigation.actions, closeMobile: onCloseMobileNavigation, editProfile: onEditProfile, signOut: onSignOut },
        meta: { ...navigation.meta, isSigningOut },
    }
    return <AppNavigationContext value={value}>{children}</AppNavigationContext>
}
