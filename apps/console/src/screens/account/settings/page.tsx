import { Tabs } from '@moc/ui/components/layout/tabs'
import { Page } from '@moc/ui/components/layout/page'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'
import { AutomationTab } from './automation-tab'
import { settingsTabLabel, useSettingsScreen, type SettingsTab } from './use-settings-screen'
import { SettingsLoadingProvider, useSettingsLoading } from './settings-loading-context'

export function SettingsScreen() {
    const { actions, meta } = useSettingsScreen()

    return <SettingsLoadingProvider activeTab={meta.activeTab}><SettingsScreenContent actions={actions} meta={meta} /></SettingsLoadingProvider>
}

type SettingsScreenContentProps = ReturnType<typeof useSettingsScreen>

function SettingsScreenContent({ actions, meta }: SettingsScreenContentProps) {
    const { state: { activeTab, isInitialLoading } } = useSettingsLoading()

    function renderTab(tab: SettingsTab) {
        return <Tabs.Tab key={tab} value={tab} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2">{settingsTabLabel[tab]}</Tabs.Tab>
    }

    function renderTabContent() {
        if (activeTab === 'general') return <WorkspaceTab />
        if (activeTab === 'notifications' && meta.canManage) return <TelegramTab />
        if (activeTab === 'integrations' && meta.canManage) return <StreamsTab />
        if (activeTab === 'automation' && meta.canManage) return <AutomationTab />
        return null
    }

    return (
        <>
        {isInitialLoading ? <Page.Loading /> : null}
        <Page hidden={isInitialLoading}>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Settings</Page.Title>
                    <Page.Description>{meta.canManage ? 'Manage your workspace, integrations, and automations.' : 'View your workspace details.'}</Page.Description>
                </Page.Heading>
            </Page.Header>

            <Page.Content>
                <Tabs value={activeTab} onValueChange={actions.selectTab} variant="pill" className="flex min-w-0 flex-col gap-6">
                    <Tabs.List className="max-w-full overflow-x-auto border-b border-secondary pb-3">
                        {meta.tabs.map(renderTab)}
                    </Tabs.List>
                    <Tabs.Panel value={activeTab} className="min-w-0 outline-none">
                        {renderTabContent()}
                    </Tabs.Panel>
                </Tabs>
            </Page.Content>
        </Page>
        </>
    )
}
