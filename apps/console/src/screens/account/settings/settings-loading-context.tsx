import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type SettingsResource = 'youtube-connection' | 'zoom-connection' | 'message-templates' | 'archive-settings' | 'date-time-settings'
type SettingsLoadingContextValue = {
  state: { isInitialLoading: boolean }
  actions: { reportLoading: (resource: SettingsResource, isLoading: boolean) => void }
  meta: { workspaceId: string | null }
}
const requiredResources: SettingsResource[] = ['youtube-connection', 'zoom-connection', 'message-templates', 'archive-settings', 'date-time-settings']
const SettingsLoadingContext = createContext<SettingsLoadingContextValue | null>(null)

export function SettingsLoadingProvider({ canManage, workspaceId, children }: { canManage: boolean; workspaceId: string | null; children: ReactNode }) {
  const [settledResources, setSettledResources] = useState<Set<SettingsResource>>(() => new Set())
  const reportLoading = useCallback((resource: SettingsResource, isLoading: boolean) => {
    if (isLoading) return
    setSettledResources((current) => {
      if (current.has(resource)) return current
      return new Set(current).add(resource)
    })
  }, [])
  const isInitialLoading = canManage && requiredResources.some((resource) => !settledResources.has(resource))
  const value = useMemo<SettingsLoadingContextValue>(() => ({ state: { isInitialLoading }, actions: { reportLoading }, meta: { workspaceId } }), [isInitialLoading, reportLoading, workspaceId])

  return <SettingsLoadingContext.Provider value={value}>{children}</SettingsLoadingContext.Provider>
}

export function useSettingsLoading() {
  const context = useContext(SettingsLoadingContext)
  if (!context) throw new Error('useSettingsLoading must be used within SettingsLoadingProvider')
  return context
}

export function useSettingsResourceLoading(resource: SettingsResource, isLoading: boolean) {
  const { actions } = useSettingsLoading()
  useEffect(() => actions.reportLoading(resource, isLoading), [actions, isLoading, resource])
}
