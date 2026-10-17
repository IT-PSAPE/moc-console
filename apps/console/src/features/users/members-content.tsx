import { Search } from 'lucide-react'
import { Section } from '@moc/ui/components/display/section'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Input } from '@moc/ui/components/form/input'
import { Page } from '@moc/ui/components/layout/page'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import { useMembersScreen } from './use-members-screen'
import { UsersList } from './users-list'
import { PendingUsersList } from './pending-users-list'

export function MembersContent() {
  const { state, actions, meta } = useMembersScreen()

  if (meta.isInitialLoading) return <Page.Loading />

  return (
    <>
      <Page>
        <Page.Header width="standard">
          <Page.Heading><Page.Title>Members</Page.Title></Page.Heading>
          <Page.Controls>
            <Input aria-label="Search members" name="member-search" autoComplete="off" icon={<Search />} placeholder="Search members…" value={state.search} onChange={actions.changeSearch} />
          </Page.Controls>
        </Page.Header>
        <Page.Content width="standard" className="flex min-w-0 flex-col gap-8">
              <Section>
                <Section.Header title="Directory" description={`${meta.totalUsers} people have access to this workspace.`} />
                <Section.Body>
                  {state.loadError ? <ResourceLoadError title="Couldn't load members" error={state.loadError} onRetry={actions.retryLoad} /> : meta.isLoading
                    ? <LoadingSpinner className="py-16" />
                    : <UsersList users={meta.users} isFiltered={meta.isFiltered} roles={meta.roles} canManage={meta.canManage} onRoleChange={actions.updateRole} />}
                </Section.Body>
              </Section>
              {meta.canManage && meta.pendingUsers.length > 0 && <Section>
                <Section.Header title="Pending approval" />
                <Section.Body><PendingUsersList users={meta.pendingUsers} onApprove={actions.approve} onReject={actions.requestReject} /></Section.Body>
              </Section>}
        </Page.Content>
      </Page>
      <ConfirmationDialog open={meta.rejectTarget !== null} onOpenChange={actions.handleRejectOpenChange} title="Reject access request?" description={meta.rejectDescription} confirmLabel="Reject" isConfirming={meta.isRejecting} onConfirm={actions.confirmReject} />
    </>
  )
}
