import { Button } from '@moc/ui/components/controls/button'
import { Page } from '@moc/ui/components/layout/page'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Link } from 'react-router-dom'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'
import { AutomationTab } from './automation-tab'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSettingsHref, settingsTabLabel, useSettingsScreen, type SettingsTab } from './use-settings-screen'
import { UsersTab } from './users-tab'

export function SettingsScreen() {
    const { meta } = useSettingsScreen()

    function renderMobileTab(tab: SettingsTab) {
        return (
            <Button.Link key={tab} render={<Link to={getSettingsHref(tab)} />} variant="secondary" aria-current={meta.activeTab === tab ? 'page' : undefined} className="justify-between px-3 py-3">
                {settingsTabLabel[tab]}
                <ChevronRight className="size-4 text-quaternary" aria-hidden="true" />
            </Button.Link>
        )
    }

    function renderDesktopTab(tab: SettingsTab) {
        return (
            <NavigationList.Item
                key={tab}
                active={meta.activeTab === tab}
                nativeButton={false}
                render={<Link to={getSettingsHref(tab)} />}
                aria-current={meta.activeTab === tab ? 'page' : undefined}
            >
                {settingsTabLabel[tab]}
            </NavigationList.Item>
        )
    }

    function renderTabContent() {
        if (meta.activeTab === 'general') return <WorkspaceTab />
        if (meta.activeTab === 'members') return <UsersTab />
        if (meta.activeTab === 'telegram' && meta.canManage) return <TelegramTab />
        if (meta.activeTab === 'streams' && meta.canManage) return <StreamsTab />
        if (meta.activeTab === 'automation' && meta.canManage) return <AutomationTab />
        return null
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>{meta.isMobile && meta.requestedTabIsAvailable ? settingsTabLabel[meta.activeTab] : 'Settings'}</Page.Title>
                    {!meta.isMobile && <Page.Description>{meta.canManage ? 'Manage your workspace, integrations, and automations.' : 'View your workspace details.'}</Page.Description>}
                </Page.Heading>
            </Page.Header>

            <Page.Content>
                {meta.showMobileIndex ? (
                    <nav aria-label="Settings">
                        <NavigationList.Root>
                            {meta.tabs.map(renderMobileTab)}
                        </NavigationList.Root>
                    </nav>
                ) : (
                    <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
                        <nav aria-label="Settings" className="hidden self-start md:sticky md:top-4 md:block">
                            <NavigationList.Root>
                                {meta.tabs.map(renderDesktopTab)}
                            </NavigationList.Root>
                        </nav>

                        <div className="flex min-w-0 flex-col gap-4">
                            {meta.isMobile ? (
                                <Button.Link render={<Link to="/account/settings" />} variant="ghost" icon={<ChevronLeft />} className="w-fit px-0">
                                    Back to settings
                                </Button.Link>
                            ) : null}
                            {renderTabContent()}
                        </div>
                    </div>
                )}
            </Page.Content>
        </Page>
    )
}
