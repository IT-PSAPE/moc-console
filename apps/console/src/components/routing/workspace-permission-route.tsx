import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useWorkspace } from '@/lib/workspace-context'
import { routes } from '@/screens/console-routes'

type WorkspacePermission = 'can_read' | 'can_create' | 'can_update' | 'can_delete' | 'can_manage_roles'

export function WorkspacePermissionRoute({ permission, children }: { permission: WorkspacePermission; children: ReactNode }) {
  const { role } = useWorkspace()
  return role?.[permission] === true ? children : <Navigate to={`/${routes.overview}`} replace />
}
