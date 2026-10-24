import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { Page } from '@moc/ui/components/layout/page'
import { ErrorBoundary } from '@/components/feedback/error-boundary'
import { useAuth } from './lib/auth-context'
import { AppShell } from './features/app-shell'
import { RequestsProvider } from '@/features/requests/request-provider'
import { EquipmentProvider } from '@/features/equipment/equipment-provider'
import { StreamsProvider } from '@/features/streams/streams-provider'
import { ChecklistsProvider } from '@/features/checklists/checklists-provider'
import { VenueBookingsProvider } from '@/features/venues/venue-bookings-provider'
import { BreadcrumbProvider } from '@moc/ui/components/navigation/breadcrumb'
import { SidebarProvider } from '@moc/ui/components/navigation/sidebar'
import { TopBarProvider } from './features/topbar'
import { WorkspaceProvider } from './lib/workspace-context'
import { useWorkspace } from './lib/workspace-context'
import { AuthLayout } from './screens/auth/auth-layout'
import { ResourceLoadError } from './components/feedback/resource-load-error'
import { WorkspaceAccessRequired } from './screens/auth/workspace-access-required'
import { UserPreferencesProvider } from './features/preferences/user-preferences-provider'

const StreamsScreen = lazy(() => import('@/screens/streams/page').then((m) => ({ default: m.StreamsScreen })))
const BroadcastsScreen = lazy(() => import('@/screens/broadcasts/page').then((m) => ({ default: m.BroadcastsScreen })))
const StreamDetailScreen = lazy(() => import('@/screens/streams/stream-detail/page').then((m) => ({ default: m.StreamDetailScreen })))
const MeetingDetailScreen = lazy(() => import('@/screens/streams/meeting-detail/page').then((m) => ({ default: m.MeetingDetailScreen })))
const BookingsScreen = lazy(() => import('@/screens/bookings/page').then((m) => ({ default: m.BookingsScreen })))
const BookingDetailScreen = lazy(() => import('@/screens/bookings/detail/page').then((m) => ({ default: m.BookingDetailScreen })))
const VenueBookingsScreen = lazy(() => import('@/screens/venues/page').then((m) => ({ default: m.VenueBookingsScreen })))
const VenueBookingDetailScreen = lazy(() => import('@/screens/venues/detail/page').then((m) => ({ default: m.VenueBookingDetailScreen })))
const EquipmentScreen = lazy(() => import('@/screens/equipment/page').then((m) => ({ default: m.EquipmentScreen })))
const EquipmentDetailScreen = lazy(() => import('@/screens/equipment/detail/page').then((m) => ({ default: m.EquipmentDetailScreen })))
const RequestsScreen = lazy(() => import('@/screens/requests/page').then((m) => ({ default: m.RequestsScreen })))
const MembersScreen = lazy(() => import('@/screens/members/page').then((m) => ({ default: m.MembersScreen })))
const OverviewPage = lazy(() => import('@/screens/overview/page').then((m) => ({ default: m.OverviewPage })))
const TelegramPage = lazy(() => import('@/screens/telegram/page').then((m) => ({ default: m.TelegramPage })))
const VenueCatalogPage = lazy(() => import('@/screens/venue-catalog/page').then((m) => ({ default: m.VenueCatalogPage })))
const SchedulePage = lazy(() => import('@/screens/schedule/page').then((m) => ({ default: m.SchedulePage })))
const RequestDetailScreen = lazy(() => import('@/screens/requests/detail/page').then((m) => ({ default: m.RequestDetailScreen })))
const ChecklistsScreen = lazy(() => import('@/screens/checklists/page').then((m) => ({ default: m.ChecklistsScreen })))
const ChecklistTemplatesScreen = lazy(() => import('@/screens/checklists/templates/page').then((m) => ({ default: m.ChecklistTemplatesScreen })))
const ChecklistDetailScreen = lazy(() => import('@/screens/checklists/detail/page').then((m) => ({ default: m.ChecklistDetailScreen })))
const LoginScreen = lazy(() => import('./screens/auth/login').then((m) => ({ default: m.LoginScreen })))
const PrivacyPolicyScreen = lazy(() => import('./screens/public/privacy').then((m) => ({ default: m.PrivacyPolicyScreen })))
const TermsOfUseScreen = lazy(() => import('./screens/public/terms').then((m) => ({ default: m.TermsOfUseScreen })))
const SupportScreen = lazy(() => import('./screens/public/support').then((m) => ({ default: m.SupportScreen })))
const ZoomDocsScreen = lazy(() => import('./screens/public/zoom-docs').then((m) => ({ default: m.ZoomDocsScreen })))
const ZoomReviewTestPlanScreen = lazy(() => import('./screens/public/zoom-review-test-plan').then((m) => ({ default: m.ZoomReviewTestPlanScreen })))
const SettingsScreen = lazy(() => import('./screens/account/settings/page').then((m) => ({ default: m.SettingsScreen })))
const MessageTemplateDetailScreen = lazy(() => import('./screens/account/settings/message-templates/detail/page').then((m) => ({ default: m.MessageTemplateDetailScreen })))
const ScheduledMessagesLayout = lazy(() => import('./screens/scheduled-messages/layout').then((m) => ({ default: m.ScheduledMessagesLayout })))
const ScheduledMessagesScreen = lazy(() => import('./screens/scheduled-messages/page').then((m) => ({ default: m.ScheduledMessagesScreen })))
const ScheduledMessageComposeScreen = lazy(() => import('./screens/scheduled-messages/compose/page').then((m) => ({ default: m.ScheduledMessageComposeScreen })))
const ScheduledTemplateScreen = lazy(() => import('./screens/scheduled-messages/templates/page').then((m) => ({ default: m.ScheduledTemplateScreen })))

function SuspenseRoute({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<Page.Loading />}>{children}</Suspense>
}

function RequireAuth() {
    const { session, loading } = useAuth()

    if (loading) {
        return <Page.Loading />
    }

    if (!session) {
        return <Navigate to={`/${routes.login}`} replace />
    }

    return (
        <UserPreferencesProvider key={session.user.id}><WorkspaceProvider>
            <WorkspaceAccessGate />
        </WorkspaceProvider></UserPreferencesProvider>
    )
}

function WorkspaceAccessGate() {
    const { currentWorkspaceId, loading, error, refresh } = useWorkspace()
    const { signOut } = useAuth()

    function retryWorkspaceAccess(): void {
        void refresh()
    }

    function signOutUser() {
        void signOut()
    }

    if (loading) {
        return <Page.Loading />
    }

    if (error) {
        return <AuthLayout><ResourceLoadError error={error} title="Couldn't load workspace access" onRetry={retryWorkspaceAccess} /></AuthLayout>
    }

    if (!currentWorkspaceId) {
        return <WorkspaceAccessRequired onSignOut={signOutUser} />
    }

    return (
        <>
            <RequestsProvider>
                <EquipmentProvider>
                    <StreamsProvider>
                        <ChecklistsProvider>
                            <VenueBookingsProvider>
                                <BreadcrumbProvider>
                                    <SidebarProvider>
                                        <TopBarProvider>
                                            <AppShell>
                                                <RouteErrorBoundary>
                                                    <Suspense fallback={<Page.Loading />}>
                                                        <Outlet />
                                                    </Suspense>
                                                </RouteErrorBoundary>
                                            </AppShell>
                                        </TopBarProvider>
                                    </SidebarProvider>
                                </BreadcrumbProvider>
                            </VenueBookingsProvider>
                        </ChecklistsProvider>
                    </StreamsProvider>
                </EquipmentProvider>
            </RequestsProvider>
        </>
    )
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth()

    if (loading) {
        return <Page.Loading />
    }

    if (session) {
        return <Navigate to={`/${routes.overview}`} replace />
    }

    return children
}

function MembersRoute() {
    const { role } = useWorkspace()
    if (role?.can_update !== true && role?.can_manage_roles !== true) return <Navigate to={`/${routes.overview}`} replace />
    return <MembersScreen />
}

function TelegramRoute() {
    const { role } = useWorkspace()
    if (role?.can_manage_roles !== true) return <Navigate to={`/${routes.overview}`} replace />
    return <TelegramPage />
}

function LegacyScheduleRoute() {
    const { search } = useLocation()
    return <Navigate to={`/${routes.work}${search}`} replace />
}

const router = createBrowserRouter([
    // Auth routes — redirect to overview if already signed in
    { path: routes.login, element: <RedirectIfAuth><SuspenseRoute><LoginScreen /></SuspenseRoute></RedirectIfAuth> },

    // Public pages — no auth required
    { path: routes.privacy, element: <SuspenseRoute><PrivacyPolicyScreen /></SuspenseRoute> },
    { path: routes.terms, element: <SuspenseRoute><TermsOfUseScreen /></SuspenseRoute> },
    { path: routes.support, element: <SuspenseRoute><SupportScreen /></SuspenseRoute> },
    { path: routes.zoomDocs, element: <SuspenseRoute><ZoomDocsScreen /></SuspenseRoute> },
    { path: routes.zoomReviewTestPlan, element: <SuspenseRoute><ZoomReviewTestPlanScreen /></SuspenseRoute> },

    // Protected app routes
    {
        element: <RequireAuth />,
        children: [
            { index: true, element: <Navigate to={`/${routes.overview}`} replace /> },
            { path: routes.overview, element: <OverviewPage /> },
            { path: routes.work, element: <SchedulePage /> },
            { path: routes.telegram, element: <TelegramRoute /> },
            { path: routes.venueCatalog, element: <VenueCatalogPage /> },
            { path: routes.settings, element: <SettingsScreen /> },
            { path: routes.members, element: <MembersRoute /> },
            { path: routes.schedule, element: <LegacyScheduleRoute /> },
            { path: routes.messageTemplateDetail, element: <MessageTemplateDetailScreen /> },
            { path: routes.scheduledMessages, element: <ScheduledMessagesLayout />, children: [
                { index: true, element: <ScheduledMessagesScreen /> },
                { path: 'new', element: <ScheduledMessageComposeScreen /> },
                { path: 'templates/new', element: <ScheduledTemplateScreen /> },
                { path: 'templates/:id', element: <ScheduledTemplateScreen /> },
            ] },
            { path: routes.requests, element: <RequestsScreen /> },
            { path: routes.requestsDetail, element: <RequestDetailScreen /> },
            { path: routes.equipment, element: <EquipmentScreen /> },
            { path: routes.equipmentDetail, element: <EquipmentDetailScreen /> },
            { path: routes.bookings, element: <BookingsScreen /> },
            { path: routes.bookingDetail, element: <BookingDetailScreen /> },
            { path: routes.venues, element: <VenueBookingsScreen /> },
            { path: routes.venueBookingDetail, element: <VenueBookingDetailScreen /> },
            { path: routes.broadcasts, element: <BroadcastsScreen /> },
            { path: routes.streams, element: <StreamsScreen /> },
            { path: routes.streamDetail, element: <StreamDetailScreen /> },
            { path: routes.meetingDetail, element: <MeetingDetailScreen /> },
            { path: routes.checklists, element: <ChecklistsScreen /> },
            { path: routes.checklistTemplates, element: <ChecklistTemplatesScreen /> },
            { path: routes.checklistDetail, element: <ChecklistDetailScreen /> },
        ],
    },
    { path: '*', element: <Navigate to={`/${routes.login}`} replace /> },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
