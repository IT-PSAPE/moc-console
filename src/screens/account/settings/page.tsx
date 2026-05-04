import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { Tabs } from '@/components/layout/tabs'
import { useAuth } from '@/lib/auth-context'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GeneralTab } from './general-tab'
import { UsersTab } from './users-tab'
import { TelegramTab } from './telegram-tab'
import { StreamsTab } from './streams-tab'
import { WorkspaceTab } from './workspace-tab'

type TabKey = 'general' | 'workspace' | 'users' | 'telegram' | 'streams'

const TAB_LABELS: Record<TabKey, string> = {
    general: 'General',
    workspace: 'Workspace',
    users: 'Users',
    telegram: 'Telegram',
    streams: 'Streams',
}

const TAB_DESCRIPTIONS: Record<TabKey, string> = {
    general: 'Workspace preferences and platform information.',
    workspace: 'Edit the name, slug, and description of the current workspace.',
    users: 'View and manage all users and their assigned roles.',
    telegram: 'Groups the bot has been added to. Toggle a group active to allow the app to send event notifications there.',
    streams: 'Connect YouTube and Zoom so the workspace can publish streams and meetings.',
}

export function SettingsScreen() {
    const { role } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()

    const canManage = role?.can_manage_roles === true

    const availableTabs = useMemo<TabKey[]>(() => {
        const tabs: TabKey[] = ['general']
        if (canManage) {
            tabs.push('workspace', 'users', 'telegram', 'streams')
        }
        return tabs
    }, [canManage])

    const requestedTab = searchParams.get('tab') as TabKey | null
    const activeTab: TabKey = requestedTab && availableTabs.includes(requestedTab) ? requestedTab : 'general'

    const handleTabChange = useCallback(
        (next: string) => {
            setSearchParams(
                (prev) => {
                    const nextParams = new URLSearchParams(prev)
                    if (next === 'general') {
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
        <section className="mx-auto max-w-content">
            <Header className="p-4 pt-8">
                <Header.Lead className="gap-2">
                    <Title.h6>Settings</Title.h6>
                    <Paragraph.sm className="text-tertiary">
                        {TAB_DESCRIPTIONS[activeTab]}
                    </Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className="px-4 pt-2">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <Tabs.List>
                        {availableTabs.map((tab) => (
                            <Tabs.Tab key={tab} value={tab}>
                                {TAB_LABELS[tab]}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </Tabs>
            </div>

            <Divider className="my-2" />

            <div className="p-4">
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'workspace' && canManage && <WorkspaceTab />}
                {activeTab === 'users' && canManage && <UsersTab />}
                {activeTab === 'telegram' && canManage && <TelegramTab />}
                {activeTab === 'streams' && canManage && <StreamsTab />}
            </div>
        </section>
    )
}
