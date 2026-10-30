import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'
import { BreadcrumbProvider } from '@moc/ui/components/navigation/breadcrumb'
import { SidebarProvider } from '@moc/ui/components/navigation/sidebar'
import { Page } from '@moc/ui/components/layout/page'
import { queryClient } from '@/lib/query-client'
import { AppShell } from '@/features/app-shell'
import { TopBarProvider } from '@/features/topbar'
import { UserPreferencesProvider } from '@/features/preferences/user-preferences-provider'
import { RequestsProvider } from '@/features/requests/request-provider'
import { EquipmentProvider } from '@/features/equipment/equipment-provider'
import { VenueBookingsProvider } from '@/features/venues/venue-bookings-provider'
import { StreamsProvider } from '@/features/streams/streams-provider'
import { OverviewPage } from '@/screens/overview/page'
import { DailyQuotesScreen } from '@/screens/daily-quotes/page'
import { PreferencesSection } from '@/screens/account/settings/preferences-section'
import { useWorkspace } from './fixture-workspace'
import '@moc/ui/styles.css'

function FixtureLayout() {
  return <UserPreferencesProvider><RequestsProvider><EquipmentProvider><VenueBookingsProvider><StreamsProvider>
    <BreadcrumbProvider><SidebarProvider><TopBarProvider><AppShell><Outlet /></AppShell></TopBarProvider></SidebarProvider></BreadcrumbProvider>
  </StreamsProvider></VenueBookingsProvider></EquipmentProvider></RequestsProvider></UserPreferencesProvider>
}
function FixturePreferences() {
  return <Page><Page.Header width="standard"><Page.Heading><Page.Title>Settings</Page.Title></Page.Heading></Page.Header><Page.Content width="standard"><PreferencesSection /></Page.Content></Page>
}
function FixtureQuotes() {
  const { role } = useWorkspace()
  return role.can_manage_roles ? <DailyQuotesScreen /> : <Navigate to="/overview?role=viewer" replace />
}
function FixtureItem() {
  return <Page><Page.Header><Page.Heading><Page.Title>Fixture item destination</Page.Title><Page.Description>Agenda links use the production paths. This isolated fixture does not send or modify work.</Page.Description></Page.Heading></Page.Header></Page>
}
const router = createBrowserRouter([{ element: <FixtureLayout />, children: [
  { path: '/overview', element: <OverviewPage /> }, { path: '/daily-quotes', element: <FixtureQuotes /> },
  { path: '/account/settings', element: <FixturePreferences /> }, { path: '/', element: <Navigate to="/overview" replace /> },
  { path: '*', element: <FixtureItem /> },
] }])
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><OverlayProvider><FeedbackProvider><RouterProvider router={router} /></FeedbackProvider></OverlayProvider></QueryClientProvider>)
