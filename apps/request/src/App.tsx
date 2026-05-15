import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { HomeScreen } from '@/screens/home-screen'
import { RequestScreen } from '@/screens/request-screen'
import { BookingScreen } from '@/screens/booking-screen'
import { ConfirmationScreen } from '@/screens/confirmation-screen'
import { TrackScreen } from '@/screens/track-screen'
import { NotFoundScreen } from '@/screens/not-found-screen'
import { ErrorScreen } from '@/screens/error-screen'

const router = createBrowserRouter([
    { path: routes.publicHome, element: <HomeScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicRequest, element: <RequestScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicBooking, element: <BookingScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicConfirmation, element: <ConfirmationScreen />, errorElement: <ErrorScreen /> },
    { path: routes.publicTrack, element: <TrackScreen />, errorElement: <ErrorScreen /> },
    { path: '*', element: <NotFoundScreen /> },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
