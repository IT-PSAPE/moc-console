import { lazy, Suspense, useState } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { ErrorBoundary } from '@/components/feedback/error-boundary'
import { useAuth } from './lib/auth-context'
import { AppShell } from './features/app-shell'
import { RequestsProvider } from '@/features/requests/request-provider'
import { EquipmentProvider } from '@/features/equipment/equipment-provider'
import { StreamsProvider } from '@/features/streams/streams-provider'
import { ChecklistsProvider } from '@/features/checklists/checklists-provider'
import { BreadcrumbProvider } from '@moc/ui/components/navigation/breadcrumb'
import { SidebarProvider } from '@moc/ui/components/navigation/sidebar'
import { TopBarProvider } from './features/topbar'
import { WorkspaceProvider } from './lib/workspace-context'
import { useWorkspace } from './lib/workspace-context'
import { PendingAccessScreen } from './screens/auth/pending-access'

const StreamsScreen = lazy(() => import('@/screens/streams/page').then((m) => ({ default: m.StreamsScreen })))
const BroadcastsScreen = lazy(() => import('@/screens/broadcasts/page').then((m) => ({ default: m.BroadcastsScreen })))
const StreamDetailScreen = lazy(() => import('@/screens/streams/stream-detail/page').then((m) => ({ default: m.StreamDetailScreen })))
const MeetingDetailScreen = lazy(() => import('@/screens/streams/meeting-detail/page').then((m) => ({ default: m.MeetingDetailScreen })))
const DashboardScreen = lazy(() => import('@/screens/dashboard/page').then((m) => ({ default: m.DashboardScreen })))
const BookingsScreen = lazy(() => import('@/screens/bookings/page').then((m) => ({ default: m.BookingsScreen })))
const BookingDetailScreen = lazy(() => import('@/screens/bookings/detail/page').then((m) => ({ default: m.BookingDetailScreen })))
const EquipmentScreen = lazy(() => import('@/screens/equipment/page').then((m) => ({ default: m.EquipmentScreen })))
const EquipmentDetailScreen = lazy(() => import('@/screens/equipment/detail/page').then((m) => ({ default: m.EquipmentDetailScreen })))
const RequestsScreen = lazy(() => import('@/screens/requests/page').then((m) => ({ default: m.RequestsScreen })))
const RequestDetailScreen = lazy(() => import('@/screens/requests/detail/page').then((m) => ({ default: m.RequestDetailScreen })))
const ChecklistsScreen = lazy(() => import('@/screens/checklists/page').then((m) => ({ default: m.ChecklistsScreen })))
const ChecklistTemplatesScreen = lazy(() => import('@/screens/checklists/templates/page').then((m) => ({ default: m.ChecklistTemplatesScreen })))
const ChecklistDetailScreen = lazy(() => import('@/screens/checklists/detail/page').then((m) => ({ default: m.ChecklistDetailScreen })))
const LoginScreen = lazy(() => import('./screens/auth/login').then((m) => ({ default: m.LoginScreen })))
const SignupScreen = lazy(() => import('./screens/auth/signup').then((m) => ({ default: m.SignupScreen })))
const ResetPasswordScreen = lazy(() => import('./screens/auth/reset-password').then((m) => ({ default: m.ResetPasswordScreen })))
const PasswordRecoveryScreen = lazy(() => import('./screens/auth/password-recovery').then((m) => ({ default: m.PasswordRecoveryScreen })))
const PrivacyPolicyScreen = lazy(() => import('./screens/public/privacy').then((m) => ({ default: m.PrivacyPolicyScreen })))
const TermsOfUseScreen = lazy(() => import('./screens/public/terms').then((m) => ({ default: m.TermsOfUseScreen })))
const SupportScreen = lazy(() => import('./screens/public/support').then((m) => ({ default: m.SupportScreen })))
const ZoomDocsScreen = lazy(() => import('./screens/public/zoom-docs').then((m) => ({ default: m.ZoomDocsScreen })))
const ZoomReviewTestPlanScreen = lazy(() => import('./screens/public/zoom-review-test-plan').then((m) => ({ default: m.ZoomReviewTestPlanScreen })))
const SettingsScreen = lazy(() => import('./screens/account/settings/page').then((m) => ({ default: m.SettingsScreen })))
const MessageTemplateDetailScreen = lazy(() => import('./screens/account/settings/message-templates/detail/page').then((m) => ({ default: m.MessageTemplateDetailScreen })))

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
        <WorkspaceProvider>
            <WorkspaceAccessGate />
        </WorkspaceProvider>
    )
}

function WorkspaceAccessGate() {
    const { currentWorkspaceId, loading, refresh } = useWorkspace()
    const { signOut } = useAuth()
    const [checking, setChecking] = useState(false)

    async function checkAgain() {
        setChecking(true)
        try {
            await refresh()
        } finally {
            setChecking(false)
        }
    }

    function signOutUser() {
        void signOut()
    }

    if (loading) {
        return <FullScreenSpinner />
    }

    if (!currentWorkspaceId) {
        return <PendingAccessScreen checking={checking} onCheckAgain={checkAgain} onSignOut={signOutUser} />
    }

    return (
        <>
            <RequestsProvider>
                <EquipmentProvider>
                    <StreamsProvider>
                        <ChecklistsProvider>
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
    { path: routes.zoomReviewTestPlan, element: <SuspenseRoute><ZoomReviewTestPlanScreen /></SuspenseRoute> },

    // Protected app routes
    {
        element: <RequireAuth />,
        children: [
            { index: true, element: <Navigate to={`/${routes.dashboard}`} replace /> },
            { path: routes.dashboard, element: <DashboardScreen /> },
            { path: routes.settings, element: <SettingsScreen /> },
            { path: routes.messageTemplateDetail, element: <MessageTemplateDetailScreen /> },
            { path: routes.requests, element: <RequestsScreen /> },
            { path: routes.requestsDetail, element: <RequestDetailScreen /> },
            { path: routes.equipment, element: <EquipmentScreen /> },
            { path: routes.equipmentDetail, element: <EquipmentDetailScreen /> },
            { path: routes.bookings, element: <BookingsScreen /> },
            { path: routes.bookingDetail, element: <BookingDetailScreen /> },
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
