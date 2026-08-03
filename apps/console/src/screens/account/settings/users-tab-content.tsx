import { Section } from "@moc/ui/components/display/section"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { useUsersSettings } from "./use-users-settings"
import { UsersList } from "./users-list"

export function UsersTabContent() {
  const { actions, meta } = useUsersSettings()

  return (
    <Section>
      <Section.Header title="Members" description={meta.isLoading ? "Loading workspace members…" : `${meta.users.length} people have access to this workspace.`} />
      <Section.Body>
        {meta.isLoading
          ? <LoadingSpinner className="py-16" />
          : <UsersList users={meta.users} roles={meta.roles} currentUserId={meta.currentUserId} canManage={meta.canManage} onRoleChange={actions.updateRole} />}
      </Section.Body>
    </Section>
  )
}
