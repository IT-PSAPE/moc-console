import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '@/lib/workspace-context'
import type { SettingsTab } from './use-settings-screen'

type SettingsResource = 'youtube-connection' | 'zoom-connection' | 'telegram-groups' | 'message-templates' | 'archive-settings'

type ResourceLoadState = { tab: SettingsTab; locationKey: string; workspaceId: string | null; isLoading: boolean }
type SettingsLoadingContextValue = {
  state: { activeTab: SettingsTab; isInitialLoading: boolean }
  actions: { reportLoading: (tab: SettingsTab, resource: SettingsResource, isLoading: boolean) => void }
  meta: { workspaceId: string | null; locationKey: string }
}

type SettingsLoadingProviderProps = { activeTab: SettingsTab; children: ReactNode }

const requiredResources: Record<SettingsTab, SettingsResource[]> = {
  general: [],
  integrations: ['youtube-connection', 'zoom-connection'],
  notifications: ['telegram-groups', 'message-templates'],
  automation: ['archive-settings'],
}

const SettingsLoadingContext = createContext<SettingsLoadingContextValue | null>(null)

export function SettingsLoadingProvider({ activeTab, children }: SettingsLoadingProviderProps) {
  const location = useLocation()
  const { currentWorkspaceId } = useWorkspace()
  const [resources, setResources] = useState<Partial<Record<SettingsResource, ResourceLoadState>>>({})

  const reportLoading = useCallback((tab: SettingsTab, resource: SettingsResource, isLoading: boolean) => {
    setResources((current) => ({
      ...current,
      [resource]: { tab, locationKey: location.key, workspaceId: currentWorkspaceId, isLoading },
    }))
  }, [currentWorkspaceId, location.key])

  const isInitialLoading = requiredResources[activeTab].some((resource) => {
    const resourceState = resources[resource]
    return !resourceState
      || resourceState.tab !== activeTab
      || resourceState.locationKey !== location.key
      || resourceState.workspaceId !== currentWorkspaceId
      || resourceState.isLoading
  })

  const value = useMemo<SettingsLoadingContextValue>(() => ({
    state: { activeTab, isInitialLoading },
    actions: { reportLoading },
    meta: { workspaceId: currentWorkspaceId, locationKey: location.key },
  }), [activeTab, currentWorkspaceId, isInitialLoading, location.key, reportLoading])

  return <SettingsLoadingContext.Provider value={value}>{children}</SettingsLoadingContext.Provider>
}

export function useSettingsLoading() {
  const context = useContext(SettingsLoadingContext)
  if (!context) throw new Error('useSettingsLoading must be used within SettingsLoadingProvider')
  return context
}

export function useSettingsResourceLoading(tab: SettingsTab, resource: SettingsResource, isLoading: boolean) {
  const { actions } = useSettingsLoading()

  useEffect(() => {
    actions.reportLoading(tab, resource, isLoading)
  }, [actions, isLoading, resource, tab])
}
