import { Tabs } from '@moc/ui/components/layout/tabs'
import { Page } from '@moc/ui/components/layout/page'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'
import { AutomationTab } from './automation-tab'
import { VenuesSection } from './venues-section'
import { EventTypesSection } from './event-types-section'
import { RequestCategoriesSection } from './request-categories-section'
import { settingsTabLabel, useSettingsScreen, type SettingsTab } from './use-settings-screen'
import { UsersTab } from './users-tab'

export function SettingsScreen() {
    const { actions, meta } = useSettingsScreen()

    function renderTab(tab: SettingsTab) {
        return <Tabs.Tab key={tab} value={tab} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2">{settingsTabLabel[tab]}</Tabs.Tab>
    }

    function renderTabContent() {
        if (meta.activeTab === 'general') return <WorkspaceTab />
        if (meta.activeTab === 'members') return <UsersTab />
        if (meta.activeTab === 'request-options' && meta.canManage) {
            return (
                <div className="flex flex-col gap-10">
                    <RequestCategoriesSection />
                    <EventTypesSection />
                    <VenuesSection />
                </div>
            )
        }
        if (meta.activeTab === 'telegram' && meta.canManage) return <TelegramTab />
        if (meta.activeTab === 'streams' && meta.canManage) return <StreamsTab />
        if (meta.activeTab === 'automation' && meta.canManage) return <AutomationTab />
        return null
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Settings</Page.Title>
                    <Page.Description>{meta.canManage ? 'Manage your workspace, integrations, and automations.' : 'View your workspace details.'}</Page.Description>
                </Page.Heading>
            </Page.Header>

            <Page.Content>
                <Tabs value={meta.activeTab} onValueChange={actions.selectTab} variant="pill" className="flex min-w-0 flex-col gap-6">
                    <Tabs.List className="max-w-full overflow-x-auto border-b border-secondary pb-3">
                        {meta.tabs.map(renderTab)}
                    </Tabs.List>
                    <Tabs.Panel value={meta.activeTab} className="min-w-0 outline-none">
                        {renderTabContent()}
                    </Tabs.Panel>
                </Tabs>
            </Page.Content>
        </Page>
    )
}
