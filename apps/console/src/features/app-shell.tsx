import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Breadcrumb } from '@moc/ui/components/navigation/breadcrumb'
import { TopBar } from './topbar'
import { ReportBugModal } from './account/report-bug-modal'
import { SkipLink } from '@moc/ui/components/navigation/skip-link'
import { useAppShell } from './use-app-shell'
import { EditProfileModal } from './account/edit-profile-modal'
import { Label } from '@moc/ui/components/display/text'
import { useWorkspace } from '@/lib/workspace-context'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { AppNavigation } from './app-navigation'


export function AppShell({ children }: { children: React.ReactNode }) {
    const { state, actions } = useAppShell()
    const { currentWorkspace } = useWorkspace()
    const isMobile = useIsMobile()

    return (
        <>
            <SkipLink />
            <div className="app-grid md:app-grid-desktop bg-primary text-primary">
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
                                    onReportBug={actions.openReportBug}
                                    onSignOut={actions.signOut}
                                />
                            </Drawer.Panel>
                        </Drawer.Portal>
                    </Drawer>
                ) : (
                    <Sidebar.Panel>
                        <AppNavigation
                            isRouteActive={actions.isRouteActive}
                            isSigningOut={state.isSigningOut}
                            onCloseMobileNavigation={actions.closeMobileSidebar}
                            onEditProfile={actions.openProfile}
                            onReportBug={actions.openReportBug}
                            onSignOut={actions.signOut}
                        />
                    </Sidebar.Panel>
                )}

                <TopBar>
                    <Breadcrumb />
                    <span className="min-w-0 truncate md:ml-2" aria-live="polite">
                        <Label.xs className="sr-only">Current workspace: </Label.xs>
                        <Label.sm className="text-tertiary">{currentWorkspace?.name ?? 'No workspace selected'}</Label.sm>
                    </span>
                </TopBar>

                <main id="main-content" tabIndex={-1} className="area-content min-h-0 overflow-y-auto overscroll-contain bg-[var(--background-color-primary)] focus-visible:outline-2 focus-visible:outline-brand">
                    {children}
                </main>
            </div>

            <EditProfileModal open={state.profileOpen} onOpenChange={actions.setProfileOpen} />
            <ReportBugModal open={state.reportBugOpen} onOpenChange={actions.setReportBugOpen} />
        </>
    )
}
