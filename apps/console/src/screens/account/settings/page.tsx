import { Page } from '@moc/ui/components/layout/page'
import { MessageTemplates } from './message-templates/list'
import { IntegrationsSection } from './integrations-section'
import { GeneralSection } from './general-section'
import { PreferencesSection } from './preferences-section'
import { DateTimeSection } from './date-time-section'
import { ArchiveAutomationsSection } from './archive-automations-section'
import { useSettingsScreen } from './use-settings-screen'
import { SettingsLoadingProvider, useSettingsLoading } from './settings-loading-context'

export function SettingsScreen() {
  const { meta } = useSettingsScreen()
  return <SettingsLoadingProvider key={meta.workspaceId ?? 'no-workspace'} canManage={meta.canManage} workspaceId={meta.workspaceId}><SettingsScreenContent key={meta.workspaceId ?? 'no-workspace'} canManage={meta.canManage} /></SettingsLoadingProvider>
}

function SettingsScreenContent({ canManage }: { canManage: boolean }) {
  const { state: { isInitialLoading } } = useSettingsLoading()
  return (
    <>
      {isInitialLoading ? <Page.Loading /> : null}
      <Page hidden={isInitialLoading}>
        <Page.Header width="standard"><Page.Heading><Page.Title>Settings</Page.Title></Page.Heading></Page.Header>
        <Page.Content width="standard">
          <div className="flex flex-col gap-8">
            <GeneralSection />
            <PreferencesSection />
            {canManage ? <>
              <DateTimeSection />
              <IntegrationsSection />
              <MessageTemplates />
              <ArchiveAutomationsSection />
            </> : null}
          </div>
        </Page.Content>
      </Page>
    </>
  )
}
