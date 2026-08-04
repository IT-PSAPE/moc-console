import { Section } from "@moc/ui/components/display/section"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { useUsersSettings } from "./use-users-settings"
import { UsersList } from "./users-list"
import { PendingUsersList } from "./pending-users-list"

export function UsersTabContent() {
  const { actions, meta } = useUsersSettings()

  return (
    <div className="space-y-8">
      {meta.canManage && meta.pendingUsers.length > 0 ? (
        <Section>
          <Section.Header title="Pending approval" description={`${meta.pendingUsers.length} ${meta.pendingUsers.length === 1 ? "person is" : "people are"} waiting for workspace access.`} />
          <Section.Body>
            <PendingUsersList users={meta.pendingUsers} onApprove={actions.approve} />
          </Section.Body>
        </Section>
      ) : null}
      <Section>
        <Section.Header title="Members" description={meta.isLoading ? "Loading workspace members…" : `${meta.users.length} people have access to this workspace.`} />
        <Section.Body>
          {meta.isLoading
            ? <LoadingSpinner className="py-16" />
            : <UsersList users={meta.users} roles={meta.roles} currentUserId={meta.currentUserId} canManage={meta.canManage} onRoleChange={actions.updateRole} />}
        </Section.Body>
      </Section>
    </div>
  )
}
