import { createContext, useContext } from 'react'
import type { useAppNavigation } from './use-app-navigation'

export type AppNavigationContextValue = ReturnType<typeof useAppNavigation> & {
    actions: ReturnType<typeof useAppNavigation>['actions'] & {
        closeLandscape: () => void
        editProfile: () => void
        signOut: () => void
    }
    meta: ReturnType<typeof useAppNavigation>['meta'] & { isSigningOut: boolean }
}

export const AppNavigationContext = createContext<AppNavigationContextValue | null>(null)

export function useNavigation(): AppNavigationContextValue {
    const value = useContext(AppNavigationContext)
    if (!value) throw new Error('App navigation must be composed inside AppNavigation.Root')
    return value
}
