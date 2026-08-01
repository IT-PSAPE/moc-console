import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { routes } from './screens/console-routes'
import { Spinner } from '@moc/ui/components/feedback/spinner'

const HomeScreen = lazy(() => import('@/screens/home-screen').then((module) => ({ default: module.HomeScreen })))
const RequestScreen = lazy(() => import('@/screens/request-screen').then((module) => ({ default: module.RequestScreen })))
const BookingScreen = lazy(() => import('@/screens/booking-screen').then((module) => ({ default: module.BookingScreen })))
const ConfirmationScreen = lazy(() => import('@/screens/confirmation-screen').then((module) => ({ default: module.ConfirmationScreen })))
const TrackScreen = lazy(() => import('@/screens/track-screen').then((module) => ({ default: module.TrackScreen })))
const NotFoundScreen = lazy(() => import('@/screens/not-found-screen').then((module) => ({ default: module.NotFoundScreen })))
const ErrorScreen = lazy(() => import('@/screens/error-screen').then((module) => ({ default: module.ErrorScreen })))

const router = createBrowserRouter([
    { path: routes.publicHome, element: <HomeScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicRequest, element: <RequestScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicBooking, element: <BookingScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicConfirmation, element: <ConfirmationScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicTrack, element: <TrackScreen />, errorElement: <ErrorScreen /> },
    { path: '*', element: <NotFoundScreen /> },
])

function App() {
    return (
        <Suspense fallback={<main className="flex min-h-dvh items-center justify-center"><Spinner size="lg" /></main>}>
            <RouterProvider router={router} />
        </Suspense>
    )
}

export default App
