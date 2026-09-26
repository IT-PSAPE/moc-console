import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { SkipLink } from '@moc/ui/components/navigation/skip-link'
import { useAppShell } from './use-app-shell'
import { EditProfileModal } from './account/edit-profile-modal'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { AppNavigation } from './app-navigation'
import { ScrollArea } from '@moc/ui/components/display/scroll-area';


export function AppShell({ children }: { children: React.ReactNode }) {
    const { state, actions } = useAppShell()
    const isMobile = useIsMobile()

    return (
        <>
            <SkipLink />
            <div className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden bg-secondary text-primary">
                {isMobile ? (
                    <Drawer open={state.mobileSidebarOpen} onOpenChange={actions.setMobileSidebarOpen} side="left">
                        <Drawer.Portal>
                            <Drawer.Backdrop />
                            <Drawer.Panel aria-label="Navigation" className="!w-[min(88%,24rem)] !max-w-none !p-0 [&>div]:rounded-none">
                                <AppNavigation
                                    isRouteActive={actions.isRouteActive}
                                    isSigningOut={state.isSigningOut}
                                    onCloseMobileNavigation={actions.closeMobileSidebar}
                                    onEditProfile={actions.openProfile}
                                    onSignOut={actions.signOut}
                                />
                            </Drawer.Panel>
                        </Drawer.Portal>
                    </Drawer>
                ) : (
                    <Sidebar.Panel className="shrink-0">
                        <AppNavigation
                            isRouteActive={actions.isRouteActive}
                            isSigningOut={state.isSigningOut}
                            onCloseMobileNavigation={actions.closeMobileSidebar}
                            onEditProfile={actions.openProfile}
                            onSignOut={actions.signOut}
                        />
                    </Sidebar.Panel>
                )}

                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2">
                    <ScrollArea id="main-content" tabIndex={-1} className="flex-1 min-h-0 rounded-xl overflow-y-auto overscroll-contain bg-primary focus-visible:outline-2 focus-visible:outline-border-brand">
                        <ScrollArea.Viewport>
                            <ScrollArea.Content className="h-full">
                                {children}
                            </ScrollArea.Content>
                        </ScrollArea.Viewport>
                    </ScrollArea>
                </main>
            </div>

            <EditProfileModal open={state.profileOpen} onOpenChange={actions.setProfileOpen} />
        </>
    )
}
