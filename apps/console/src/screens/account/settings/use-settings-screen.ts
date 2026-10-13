import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { useWorkspace } from '@/lib/workspace-context'

export type SettingsTab = 'general' | 'integrations' | 'notifications' | 'automation'

export const settingsTabLabel: Record<SettingsTab, string> = {
  automation: 'Automation',
  general: 'General',
  integrations: 'Integrations',
  notifications: 'Notifications',
}

export function useSettingsScreen() {
  const { role } = useWorkspace()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManage = role?.can_manage_roles === true
  const canViewMembers = canManage || role?.can_update === true
  const tabs: SettingsTab[] = canManage ? ['general', 'integrations', 'notifications', 'automation'] : ['general']
  const tabParam = searchParams.get('tab')
  const legacyRoutes: Record<string, string> = {
    members: `/${routes.members}`,
    'request-options': `/${routes.requests}`,
    'request-categories': `/${routes.requests}`,
    venues: `/${routes.venues}`,
    events: `/${routes.venues}`,
  }
  const legacyRoute = tabParam && (tabParam === 'members' ? canViewMembers : canManage) ? legacyRoutes[tabParam] : null
  const resolvedTab = tabParam === 'streams' ? 'integrations' : tabParam === 'telegram' ? 'notifications' : tabParam === 'workspace' ? 'general' : tabParam
  const requestedTab = resolvedTab as SettingsTab | null
  const activeTab = requestedTab !== null && tabs.includes(requestedTab) ? requestedTab : 'general'

  useEffect(() => {
    if (legacyRoute) navigate(legacyRoute, { replace: true })
  }, [legacyRoute, navigate])

  function selectTab(value: string): void {
    if (!tabs.includes(value as SettingsTab)) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', value)
    setSearchParams(nextParams)
  }

  return { actions: { selectTab }, meta: { activeTab, canManage, tabs } }
}
