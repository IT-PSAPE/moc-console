import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { SkipLink } from '@moc/ui/components/navigation/skip-link'
import { useAppShell } from './use-app-shell'
import { EditProfileModal } from './account/edit-profile-modal'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
import { AppNavigation } from './app-navigation'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { TopBar } from './topbar'


export function AppShell({ children }: { children: React.ReactNode }) {
    const { state, actions } = useAppShell()
    const isLandscape = useIsLandscape()
    return (
        <AppNavigation.Root canManageScheduledMessages={state.canManageScheduledMessages} isSigningOut={state.isSigningOut} onCloseLandscapeNavigation={actions.closeLandscapeSidebar} onEditProfile={actions.openProfile} onSignOut={actions.signOut}>
            <SkipLink />
            <div className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden bg-secondary text-primary">
                {isLandscape ? (
                    <Drawer open={state.landscapeSidebarOpen} onOpenChange={actions.setLandscapeSidebarOpen} side="left">
                        <Drawer.Portal>
                            <Drawer.Backdrop />
                            <Drawer.Panel aria-label="Navigation" className="!w-[min(88%,24rem)] !max-w-none !p-0 [&>div]:rounded-none">
                                <Sidebar.Layout>
                                    <AppNavigation.Rail />
                                    <AppNavigation.Content />
                                </Sidebar.Layout>
                            </Drawer.Panel>
                        </Drawer.Portal>
                    </Drawer>
                ) : (
                    <Sidebar.Panel className="shrink-0">
                        <AppNavigation.Rail />
                    </Sidebar.Panel>
                )}

                <Sidebar.Layout className="flex-1 overflow-hidden py-2 pr-2 landscape:py-0 landscape:pr-0">
                    <Sidebar.Layout className="flex-1 overflow-hidden rounded-xl bg-primary landscape:rounded-none">
                        {!isLandscape ? <AppNavigation.Content /> : null}
                        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <TopBar />
                            <ScrollArea id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-border-brand">
                                <ScrollArea.Viewport>
                                    {/* Vertical scrolling only: Base UI sizes content to fit-content, which lets one long line widen the whole page. */}
                                    <ScrollArea.Content className="h-full w-full min-w-0!">
                                        {children}
                                    </ScrollArea.Content>
                                </ScrollArea.Viewport>
                            </ScrollArea>
                        </main>
                    </Sidebar.Layout>
                </Sidebar.Layout>
            </div>

            <EditProfileModal open={state.profileOpen} onOpenChange={actions.setProfileOpen} />
        </AppNavigation.Root>
    )
}
