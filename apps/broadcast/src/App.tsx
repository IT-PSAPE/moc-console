import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './screens/broadcast-routes'
import { WorkspaceChooserScreen } from '@/screens/workspace-chooser-screen'
import { HomeScreen } from '@/screens/home-screen'
import { PlayerScreen } from '@/screens/player-screen'
import { NotFoundScreen } from '@/screens/not-found-screen'
import { ErrorScreen } from '@/screens/error-screen'

const router = createBrowserRouter([
  { path: routes.chooser, element: <WorkspaceChooserScreen />, errorElement: <ErrorScreen /> },
  { path: routes.home, element: <HomeScreen />, errorElement: <ErrorScreen /> },
  { path: routes.player, element: <PlayerScreen />, errorElement: <ErrorScreen /> },
  { path: '*', element: <NotFoundScreen /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
