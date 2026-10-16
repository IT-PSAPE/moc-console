import { Page } from '@moc/ui/components/layout/page'
import { Section } from '@moc/ui/components/display/section'
import { Paragraph } from '@moc/ui/components/display/text'
import { RetryAlert } from '@moc/ui/components/feedback/retry-alert'
import { ConnectEventsModal } from '@/features/notifications/connect-events-modal'
import { useWorkspace } from '@/lib/workspace-context'
import { MemberDestinationRow } from './member-destination-row'
import { TelegramGroupsSection } from './groups-section'
import { TelegramProvider, useTelegramContext } from './telegram-context'
import { UsersProvider } from '@/features/users/users-provider'

export function TelegramPage() {
  const { currentWorkspaceId } = useWorkspace()
  return (
    <UsersProvider key={currentWorkspaceId ?? 'no-workspace'}>
      <TelegramProvider key={currentWorkspaceId ?? 'no-workspace'}>
        <TelegramPageContent />
      </TelegramProvider>
    </UsersProvider>
  )
}

function TelegramPageContent() {
  const { state, actions, meta } = useTelegramContext()

  function renderUser(user: (typeof state.linkedUsers)[number]) {
    return <MemberDestinationRow key={user.id} user={user} onOpenConnect={actions.openMemberConnect} />
  }

  if (!meta.canManage) return <Page><Page.Content><Section><Section.Header title="Telegram" /><Section.Body>Workspace administrator access is required.</Section.Body></Section></Page.Content></Page>
  if (state.isInitialLoading) return <Page.Loading />

  return (
    <>
      <Page>
        <Page.Header><Page.Heading><Page.Title>Telegram</Page.Title></Page.Heading></Page.Header>
        <Page.Content className="flex min-w-0 flex-col gap-10">
          <TelegramGroupsSection />
          <Section>
            <Section.Header title="Individual members" description="Choose which events are sent to each linked member in Telegram." />
            <Section.Body className="gap-4">
              {state.membersError ? <RetryAlert title="Couldn't load members" description={state.membersError.message} onRetry={actions.loadMembers} isRetrying={state.isMembersLoading} /> : state.isMembersLoading ? <Paragraph.sm className="py-8 text-center text-tertiary">Loading members…</Paragraph.sm> : state.linkedUsers.length ? state.linkedUsers.map(renderUser) : <Paragraph.sm className="py-8 text-center text-tertiary">No linked members found.</Paragraph.sm>}
            </Section.Body>
          </Section>
        </Page.Content>
      </Page>
      <ConnectEventsModal target={state.connectTarget} onClose={actions.closeConnect} />
    </>
  )
}
