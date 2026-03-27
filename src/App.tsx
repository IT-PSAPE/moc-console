import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { QueryProvider } from '@/contexts/query-context'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { PortalProvider } from '@/contexts/portal-context'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/components/auth/login-page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { usePortals } from '@/contexts/portal-context'
import { registerAllPortals } from '@/lib/register-portals'

registerAllPortals()

function PortalRoutes() {
  const { state: { portals } } = usePortals()

  return (
    <Routes>
      {portals.map((portal) => {
        const Component = portal.component
        return (
          <Route
            key={portal.id}
            path={`${portal.basePath}/*`}
            element={<Component />}
          />
        )
      })}
      <Route path="/" element={<Navigate to={portals[0]?.basePath ?? '/requests'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AuthenticatedApp() {
  return (
    <SidebarProvider>
      <PortalProvider>
        <Routes>
          <Route element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route path="/*" element={<PortalRoutes />} />
          </Route>
        </Routes>
      </PortalProvider>
    </SidebarProvider>
  )
}

function AppRoutes() {
  const { state: { isAuthenticated } } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/*" element={<AuthenticatedApp />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}
