import { Search } from 'lucide-react'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Section } from '@moc/ui/components/display/section'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Input } from '@moc/ui/components/form/input'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Page } from '@moc/ui/components/layout/page'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import { useMembersScreen } from './use-members-screen'
import { UsersList } from './users-list'
import { InvitationRow } from './invitation-row'

export function MembersContent() {
  const { state, actions, meta } = useMembersScreen()

  function renderInvitation(invitation: (typeof meta.invitations)[number]) {
    return <InvitationRow key={invitation.id} email={invitation.email} formattedExpiry={invitation.formattedExpiry} busyAction={invitation.busyAction} disabled={invitation.disabled} onResend={invitation.onResend} onRevoke={invitation.onRevoke} />
  }

  if (meta.isInitialLoading) return <Page.Loading />

  return (
    <>
      <Page>
        <Page.Header width="standard">
          <Page.Heading><Page.Title>Members</Page.Title></Page.Heading>
          <Page.Controls><Input aria-label="Search members" name="member-search" autoComplete="off" icon={<Search />} placeholder="Search members…" value={state.search} onChange={actions.changeSearch} /></Page.Controls>
        </Page.Header>
        <Page.Content width="standard" className="flex min-w-0 flex-col gap-8">
              <Section>
                <Section.Header title="Directory" description={`${meta.totalUsers} people have access to this workspace.`} />
                <Section.Body>
                  {state.loadError && <ResourceLoadError title="Couldn't load members" error={state.loadError} onRetry={actions.retryLoad} />}
                  {meta.totalUsers > 0 || !state.loadError ? meta.isLoading && meta.totalUsers === 0
                    ? <LoadingSpinner className="py-16" />
                    : <UsersList users={meta.users} isFiltered={meta.isFiltered} roles={meta.roles} canManage={meta.canManage} onRoleChange={actions.updateRole} /> : null}
                </Section.Body>
              </Section>
              {meta.canManage && <Section>
                <Section.Header title="Invitations" description="Invite people by email. Invitations expire after seven days." />
                <Section.Body className="gap-4">
                  <form onSubmit={actions.submitInvitation} className="flex flex-col gap-2">
                    <Label.sm>Email address</Label.sm>
                    <div className="flex flex-wrap gap-2">
                      <Input id="member-invite-email" aria-label="Email address to invite" name="invite-email" autoComplete="email" type="email" placeholder="person@example.com" value={state.email} onChange={actions.changeEmail} required className="min-w-56 flex-1" />
                      <Button type="submit" disabled={state.isInviting}>{state.isInviting ? "Sending…" : "Invite"}</Button>
                    </div>
                    {state.invitationError && <Alert variant="error" title={state.invitationError} />}
                  </form>
                  {meta.invitations.length > 0
                    ? <DividedList>{meta.invitations.map(renderInvitation)}</DividedList>
                    : <Paragraph.sm className="text-tertiary">No pending invitations.</Paragraph.sm>}
                </Section.Body>
              </Section>}
        </Page.Content>
      </Page>
    </>
  )

}
