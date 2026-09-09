import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Suspense, lazy } from "react"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { routes } from "./screens/broadcast-routes"

const HomeScreen = lazy(() => import("@/screens/home-screen").then((module) => ({ default: module.HomeScreen })))
const PublicBroadcastScreen = lazy(() => import("@/screens/public-broadcast-screen").then((module) => ({ default: module.PublicBroadcastScreen })))

const router = createBrowserRouter([
  { path: routes.home, element: <HomeScreen /> },
  { path: routes.broadcast, element: <PublicBroadcastScreen /> },
])

function App() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center"><Spinner size="lg" /></main>}>
      <RouterProvider router={router} />
    </Suspense>
  )
}

export default App
