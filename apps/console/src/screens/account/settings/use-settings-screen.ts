import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { useWorkspace } from '@/lib/workspace-context'

export function useSettingsScreen() {
  const { role, currentWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canManage = role?.can_manage_roles === true
  const canViewMembers = canManage || role?.can_update === true
  const tabParam = searchParams.get('tab')
  const legacyRoutes: Record<string, string> = {
    members: `/${routes.members}`,
    'request-options': `/${routes.requests}`,
    'request-categories': `/${routes.requests}`,
    venues: `/${routes.venues}`,
    events: `/${routes.venues}`,
  }
  const legacyRoute = tabParam && (tabParam === 'members' ? canViewMembers : canManage) ? legacyRoutes[tabParam] : null

  useEffect(() => {
    if (legacyRoute) navigate(legacyRoute, { replace: true })
  }, [legacyRoute, navigate])

  return { meta: { canManage, workspaceId: currentWorkspaceId } }
}
