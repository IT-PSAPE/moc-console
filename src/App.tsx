import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { Spinner } from '@/components/feedback/spinner'
import { ErrorBoundary } from '@/components/feedback/error-boundary'
import { useAuth } from './lib/auth-context'
import { AppShell } from './features/app-shell'
import { RequestsProvider } from '@/features/requests/request-provider'
import { EquipmentProvider } from '@/features/equipment/equipment-provider'
import { BroadcastProvider } from '@/features/broadcast/broadcast-provider'
import { CueSheetProvider } from './features/cue-sheet/cue-sheet-provider'
import { UsersProvider } from './features/users/users-provider'
import { BreadcrumbProvider } from './components/navigation/breadcrumb'
import { SidebarProvider } from './components/navigation/sidebar'
import { TopBarProvider } from './features/topbar'

const BroadcastMediaScreen = lazy(() => import('@/screens/broadcast/media/page').then((m) => ({ default: m.BroadcastMediaScreen })))
const MediaDetailScreen = lazy(() => import('@/screens/broadcast/media/detail/page').then((m) => ({ default: m.MediaDetailScreen })))
const BroadcastOverviewScreen = lazy(() => import('@/screens/broadcast/page').then((m) => ({ default: m.BroadcastOverviewScreen })))
const PlaylistScreen = lazy(() => import('@/screens/broadcast/playlist/page').then((m) => ({ default: m.PlaylistScreen })))
const PlaylistDetailScreen = lazy(() => import('@/screens/broadcast/detail/page').then((m) => ({ default: m.PlaylistDetailScreen })))
const StreamsScreen = lazy(() => import('@/screens/broadcast/streams/page').then((m) => ({ default: m.StreamsScreen })))
const StreamDetailScreen = lazy(() => import('@/screens/broadcast/streams/stream-detail/page').then((m) => ({ default: m.StreamDetailScreen })))
const MeetingDetailScreen = lazy(() => import('@/screens/broadcast/streams/meeting-detail/page').then((m) => ({ default: m.MeetingDetailScreen })))
const CueSheetEventScreen = lazy(() => import('@/screens/cue-sheet/events/page').then((m) => ({ default: m.CueSheetEventScreen })))
const CueSheetEventDetailScreen = lazy(() => import('@/screens/cue-sheet/events/detail/page').then((m) => ({ default: m.CueSheetEventDetailScreen })))
const CueSheetOverviewScreen = lazy(() => import('@/screens/cue-sheet/page').then((m) => ({ default: m.CueSheetOverviewScreen })))
const DashboardScreen = lazy(() => import('@/screens/dashboard/page').then((m) => ({ default: m.DashboardScreen })))
const EquipmentBookingsScreen = lazy(() => import('@/screens/equipment/booking/page').then((m) => ({ default: m.EquipmentBookingsScreen })))
const EquipmentInventoryScreen = lazy(() => import('@/screens/equipment/inventory/page').then((m) => ({ default: m.EquipmentInventoryScreen })))
const EquipmentMaintenanceScreen = lazy(() => import('@/screens/equipment/maintenance/page').then((m) => ({ default: m.EquipmentMaintenanceScreen })))
const EquipmentOverviewScreen = lazy(() => import('@/screens/equipment/page').then((m) => ({ default: m.EquipmentOverviewScreen })))
const EquipmentDetailScreen = lazy(() => import('@/screens/equipment/detail/page').then((m) => ({ default: m.EquipmentDetailScreen })))
const RequestsAllRequestsScreen = lazy(() => import('@/screens/requests/all-requests/page').then((m) => ({ default: m.RequestsAllRequestsScreen })))
const RequestsArchivedScreen = lazy(() => import('@/screens/requests/archived/page').then((m) => ({ default: m.RequestsArchivedScreen })))
const RequestsOverviewScreen = lazy(() => import('@/screens/requests/page').then((m) => ({ default: m.RequestsOverviewScreen })))
const RequestDetailScreen = lazy(() => import('@/screens/requests/detail/page').then((m) => ({ default: m.RequestDetailScreen })))
const CueSheetChecklistScreen = lazy(() => import('./screens/cue-sheet/checklist/page').then((m) => ({ default: m.CueSheetChecklistScreen })))
const CueSheetChecklistDetailScreen = lazy(() => import('./screens/cue-sheet/checklist/detail/page').then((m) => ({ default: m.CueSheetChecklistDetailScreen })))
const CueSheetTemplatesScreen = lazy(() => import('./screens/cue-sheet/templates/page').then((m) => ({ default: m.CueSheetTemplatesScreen })))
const UsersScreen = lazy(() => import('./screens/users/page').then((m) => ({ default: m.UsersScreen })))
const TelegramGroupsScreen = lazy(() => import('./screens/admin/telegram-groups/page').then((m) => ({ default: m.TelegramGroupsScreen })))
const LoginScreen = lazy(() => import('./screens/auth/login').then((m) => ({ default: m.LoginScreen })))
const SignupScreen = lazy(() => import('./screens/auth/signup').then((m) => ({ default: m.SignupScreen })))
const ResetPasswordScreen = lazy(() => import('./screens/auth/reset-password').then((m) => ({ default: m.ResetPasswordScreen })))
const PasswordRecoveryScreen = lazy(() => import('./screens/auth/password-recovery').then((m) => ({ default: m.PasswordRecoveryScreen })))
const PrivacyPolicyScreen = lazy(() => import('./screens/public/privacy').then((m) => ({ default: m.PrivacyPolicyScreen })))
const TermsOfUseScreen = lazy(() => import('./screens/public/terms').then((m) => ({ default: m.TermsOfUseScreen })))
const SupportScreen = lazy(() => import('./screens/public/support').then((m) => ({ default: m.SupportScreen })))
const ZoomDocsScreen = lazy(() => import('./screens/public/zoom-docs').then((m) => ({ default: m.ZoomDocsScreen })))
const ProfileScreen = lazy(() => import('./screens/account/profile').then((m) => ({ default: m.ProfileScreen })))
const SettingsScreen = lazy(() => import('./screens/account/settings').then((m) => ({ default: m.SettingsScreen })))
const CueSheetShareScreen = lazy(() => import('./screens/public/cue-sheet-share/page').then((m) => ({ default: m.CueSheetShareScreen })))

function FullScreenSpinner() {
    return (
        <div className="flex min-h-dvh items-center justify-center">
            <Spinner size="lg" />
        </div>
    )
}

function SuspenseRoute({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<FullScreenSpinner />}>{children}</Suspense>
}

function RequireAuth() {
    const { session, loading } = useAuth()

    if (loading) {
        return <FullScreenSpinner />
    }

    if (!session) {
        return <Navigate to={`/${routes.login}`} replace />
    }

    return (
        <BreadcrumbProvider>
            <SidebarProvider>
                <TopBarProvider>
                    <AppShell>
                        <RouteErrorBoundary>
                            <Suspense fallback={<FullScreenSpinner />}>
                                <Outlet />
                            </Suspense>
                        </RouteErrorBoundary>
                    </AppShell>
                </TopBarProvider>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth()

    if (loading) {
        return <FullScreenSpinner />
    }

    if (session) {
        return <Navigate to={`/${routes.dashboard}`} replace />
    }

    return children
}

const router = createBrowserRouter([
    // Auth routes — redirect to dashboard if already signed in
    { path: routes.login, element: <RedirectIfAuth><SuspenseRoute><LoginScreen /></SuspenseRoute></RedirectIfAuth> },
    { path: routes.signup, element: <RedirectIfAuth><SuspenseRoute><SignupScreen /></SuspenseRoute></RedirectIfAuth> },
    { path: routes.resetPassword, element: <RedirectIfAuth><SuspenseRoute><ResetPasswordScreen /></SuspenseRoute></RedirectIfAuth> },
    { path: routes.passwordRecovery, element: <SuspenseRoute><PasswordRecoveryScreen /></SuspenseRoute> },

    // Public pages — no auth required
    { path: routes.privacy, element: <SuspenseRoute><PrivacyPolicyScreen /></SuspenseRoute> },
    { path: routes.terms, element: <SuspenseRoute><TermsOfUseScreen /></SuspenseRoute> },
    { path: routes.support, element: <SuspenseRoute><SupportScreen /></SuspenseRoute> },
    { path: routes.zoomDocs, element: <SuspenseRoute><ZoomDocsScreen /></SuspenseRoute> },
    { path: routes.publicEventShare, element: <SuspenseRoute><CueSheetShareScreen /></SuspenseRoute> },

    // Protected app routes
    {
        element: <RequireAuth />,
        children: [
            { index: true, element: <Navigate to={`/${routes.dashboard}`} replace /> },
            { path: routes.dashboard, element: <RequestsProvider><EquipmentProvider><BroadcastProvider><CueSheetProvider><DashboardScreen /></CueSheetProvider></BroadcastProvider></EquipmentProvider></RequestsProvider> },
            { path: routes.users, element: <UsersProvider><UsersScreen /></UsersProvider> },
            { path: routes.telegramGroups, element: <TelegramGroupsScreen /> },
            { path: routes.profile, element: <ProfileScreen /> },
            { path: routes.settings, element: <SettingsScreen /> },
            {
                element: <RequestsProvider><Outlet /></RequestsProvider>,
                children: [
                    { path: routes.requestsOverview, element: <RequestsOverviewScreen /> },
                    { path: routes.requestsAllRequests, element: <RequestsAllRequestsScreen /> },
                    { path: routes.requestsArchived, element: <RequestsArchivedScreen /> },
                    { path: routes.requestsDetail, element: <RequestDetailScreen /> },
                ],
            },
            {
                element: <EquipmentProvider><Outlet /></EquipmentProvider>,
                children: [
                    { path: routes.equipmentOverview, element: <EquipmentOverviewScreen /> },
                    { path: routes.equipmentInventory, element: <EquipmentInventoryScreen /> },
                    { path: routes.equipmentBookings, element: <EquipmentBookingsScreen /> },
                    { path: routes.equipmentMaintenance, element: <EquipmentMaintenanceScreen /> },
                    { path: routes.equipmentDetail, element: <EquipmentDetailScreen /> },
                ],
            },
            {
                element: <BroadcastProvider><Outlet /></BroadcastProvider>,
                children: [
                    { path: routes.broadcastOverview, element: <BroadcastOverviewScreen /> },
                    { path: routes.broadcastMedia, element: <BroadcastMediaScreen /> },
                    { path: routes.broadcastMediaDetail, element: <MediaDetailScreen /> },
                    { path: routes.broadcastPlaylists, element: <PlaylistScreen /> },
                    { path: routes.broadcastPlaylistDetail, element: <PlaylistDetailScreen /> },
                    { path: routes.broadcastStreams, element: <StreamsScreen /> },
                    { path: routes.broadcastStreamDetail, element: <StreamDetailScreen /> },
                    { path: routes.broadcastMeetingDetail, element: <MeetingDetailScreen /> },
                ],
            },
            {
                element: <CueSheetProvider><Outlet /></CueSheetProvider>,
                children: [
                    { path: routes.cueSheetOverview, element: <CueSheetOverviewScreen /> },
                    { path: routes.cueSheetEvents, element: <CueSheetEventScreen /> },
                    { path: routes.cueSheetEventDetail, element: <CueSheetEventDetailScreen /> },
                    { path: routes.cueSheetChecklists, element: <CueSheetChecklistScreen /> },
                    { path: routes.cueSheetChecklistDetail, element: <CueSheetChecklistDetailScreen /> },
                    { path: routes.cueSheetTemplates, element: <CueSheetTemplatesScreen /> },
                ],
            },
        ],
    },
    { path: '*', element: <Navigate to={`/${routes.login}`} replace /> },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
