import { MemberNotificationContext } from "./member-notification-context"
import { ConnectEventsModal } from "./connect-events-modal"
import { Section } from "@moc/ui/components/display/section"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { useUsersSettings } from "./use-users-settings"
import { UsersList } from "./users-list"
import { PendingUsersList } from "./pending-users-list"
import { MemberTypesSection } from '@/features/users/member-types-section'

export function UsersTabContent() {
  const { actions, meta } = useUsersSettings()

  return (
    <MemberNotificationContext value={{ state: {}, actions: { openConnectUser: actions.openConnectUser }, meta: {} }}>
    <div className="space-y-8">
      <MemberTypesSection />
      {meta.canManage && meta.pendingUsers.length > 0 ? (
        <Section>
          <Section.Header title="Pending approval" description={`${meta.pendingUsers.length} ${meta.pendingUsers.length === 1 ? "person is" : "people are"} waiting for workspace access.`} />
          <Section.Body>
            <PendingUsersList users={meta.pendingUsers} onApprove={actions.approve} onReject={actions.requestReject} />
          </Section.Body>
        </Section>
      ) : null}
      <Section>
        <Section.Header title="Members" description={meta.isLoading ? "Loading workspace members…" : `${meta.users.length} people have access to this workspace.`} />
        <Section.Body>
          {meta.isLoading
            ? <LoadingSpinner className="py-16" />
            : <UsersList users={meta.users} roles={meta.roles} canManage={meta.canManage} onRoleChange={actions.updateRole} />}
        </Section.Body>
      </Section>
      <ConfirmationDialog
        open={meta.rejectTarget !== null}
        onOpenChange={actions.handleRejectOpenChange}
        title="Reject access request?"
        description={meta.rejectDescription}
        confirmLabel="Reject"
        isConfirming={meta.isRejecting}
        onConfirm={actions.confirmReject}
      />
      <ConnectEventsModal target={meta.connectTarget} onClose={actions.closeConnect} />
    </div>
    </MemberNotificationContext>
  )
}
