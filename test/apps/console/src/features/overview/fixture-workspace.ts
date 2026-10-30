import type { Role } from '@moc/types/requests/assignee'
import { fixtureWorkspaceId } from './fixture-data'
import { useFixtureRole } from './fixture-role'

export function useWorkspace() {
  const admin = useFixtureRole() === 'admin'
  const role: Role = { id: admin ? 'admin' : 'viewer', name: admin ? 'admin' : 'viewer', can_read: true, can_create: admin, can_update: admin, can_delete: admin, can_manage_roles: admin }
  const workspace = { id: fixtureWorkspaceId, name: 'Studio Church', slug: 'fixture', description: null }
  return { workspaces: [workspace], currentWorkspace: workspace, currentWorkspaceId: workspace.id, role, loading: false, error: null, refresh: async () => undefined, setCurrentWorkspaceId: () => undefined }
}
