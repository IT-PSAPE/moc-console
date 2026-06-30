import { Header } from '@moc/ui/components/display/header'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { Title } from '@moc/ui/components/display/text'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { useAuth } from '@/lib/auth-context'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProfileTab } from './profile-tab'
import { SupportTab } from './support-tab'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'
import { AutomationTab } from './automation-tab'

type TabKey = 'profile' | 'workspace' | 'telegram' | 'streams' | 'automation' | 'support'

export function SettingsScreen() {
    const { role } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()

    const canManage = role?.can_manage_roles === true

    const availableTabs = useMemo<TabKey[]>(() => {
        const tabs: TabKey[] = ['profile']
        if (canManage) {
            tabs.push('workspace', 'telegram', 'streams', 'automation')
        }
        tabs.push('support')
        return tabs
    }, [canManage])

    const requestedTab = searchParams.get('tab') as TabKey | null
    const activeTab: TabKey = requestedTab && availableTabs.includes(requestedTab) ? requestedTab : 'profile'

    const handleTabChange = useCallback(
        (next: string) => {
            setSearchParams(
                (prev) => {
                    const nextParams = new URLSearchParams(prev)
                    if (next === 'profile') {
                        nextParams.delete('tab')
                    } else {
                        nextParams.set('tab', next)
                    }
                    return nextParams
                },
                { replace: true },
            )
        },
        [setSearchParams],
    )

    return (
        <section className="mx-auto max-w-content-md">
            <Header className="p-4 pt-8">
                <Header.Lead className="gap-2">
                    <Title.h6>Settings</Title.h6>
                </Header.Lead>
            </Header>

            <Tabs variant="pill" value={activeTab} onValueChange={handleTabChange}>
                <ScrollArea>
                    <ScrollArea.Viewport className="px-4 pt-2">
                        <ScrollArea.Content>
                            <Tabs.List className="w-max">
                                <Tabs.Tab value={'profile'}>Profile</Tabs.Tab>
                                {canManage && <Tabs.Tab value={'workspace'}>Workspace</Tabs.Tab>}
                                {canManage && <Tabs.Tab value={'telegram'}>Telegram</Tabs.Tab>}
                                {canManage && <Tabs.Tab value={'streams'}>Streams</Tabs.Tab>}
                                {canManage && <Tabs.Tab value={'automation'}>Automation</Tabs.Tab>}
                                <Tabs.Tab value={'support'}>Support</Tabs.Tab>
                            </Tabs.List>
                        </ScrollArea.Content>
                    </ScrollArea.Viewport>
                </ScrollArea>
            </Tabs>

            <div className="p-4">
                {activeTab === 'support' && <SupportTab />}
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'workspace' && canManage && <WorkspaceTab />}
                {activeTab === 'telegram' && canManage && <TelegramTab />}
                {activeTab === 'streams' && canManage && <StreamsTab />}
                {activeTab === 'automation' && canManage && <AutomationTab />}
            </div>
        </section>
    )
}
