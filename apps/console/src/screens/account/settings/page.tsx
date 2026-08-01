import { Button } from '@moc/ui/components/controls/button'
import { Page } from '@moc/ui/components/layout/page'
import { Link } from 'react-router-dom'
import { cn } from '@moc/utils/cn'
import { ProfileTab } from './profile-tab'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'
import { AutomationTab } from './automation-tab'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSettingsHref, settingsTabLabel, useSettingsScreen } from './use-settings-screen'

export function SettingsScreen() {
    const { meta } = useSettingsScreen()

    const tabContent = (
        <div className="min-w-0">
            {meta.activeTab === 'profile' && <ProfileTab />}
            {meta.activeTab === 'workspace' && meta.canManage && <WorkspaceTab />}
            {meta.activeTab === 'telegram' && meta.canManage && <TelegramTab />}
            {meta.activeTab === 'streams' && meta.canManage && <StreamsTab />}
            {meta.activeTab === 'automation' && meta.canManage && <AutomationTab />}
        </div>
    )

    return (
        <Page>
            <Page.Header className="max-w-content-md">
                <Page.Heading>
                    <Page.Title>{meta.isMobile && meta.requestedTabIsAvailable ? settingsTabLabel[meta.activeTab] : 'Settings'}</Page.Title>
                </Page.Heading>
            </Page.Header>

            <Page.Content width="standard">
                {meta.showMobileIndex ? (
                    <nav aria-label="Settings" className="flex flex-col divide-y divide-secondary">
                        {meta.tabs.map((tab) => (
                            <Button.Link key={tab} render={<Link to={getSettingsHref(tab)} />} variant="ghost" className="justify-between rounded-none px-0 py-3">
                                {settingsTabLabel[tab]}
                                <ChevronRight className="size-4 text-quaternary" aria-hidden="true" />
                            </Button.Link>
                        ))}
                    </nav>
                ) : (
                    <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
                        <nav aria-label="Settings" className="hidden flex-col gap-1 border-r border-secondary pr-4 md:flex">
                            {meta.tabs.map((tab) => (
                                <Button.Link
                                    key={tab}
                                    render={<Link to={getSettingsHref(tab)} />}
                                    variant="ghost"
                                    className={cn('justify-start', meta.activeTab === tab && 'bg-secondary text-primary')}
                                >
                                    {settingsTabLabel[tab]}
                                </Button.Link>
                            ))}
                        </nav>

                        <div className="flex min-w-0 flex-col gap-4">
                            {meta.isMobile ? (
                                <Button.Link render={<Link to="/account/settings" />} variant="ghost" icon={<ChevronLeft />} className="w-fit px-0">
                                    Back to settings
                                </Button.Link>
                            ) : null}
                            {tabContent}
                        </div>
                    </div>
                )}
            </Page.Content>
        </Page>
    )
}
