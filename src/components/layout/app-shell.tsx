import { Outlet, useLocation } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeft, ChevronRight } from 'lucide-react'
import { Sidebar } from './sidebar'
import { IconButton } from '@/components/ui/icon-button'
import { useSidebar } from '@/contexts/sidebar-context'
import { usePortals } from '@/contexts/portal-context'

function Breadcrumb() {
  const location = useLocation()
  const { state: { portals } } = usePortals()

  const activePortal = portals.find((p) => location.pathname.startsWith(p.basePath))
  if (!activePortal) return null

  const relativePath = location.pathname.slice(activePortal.basePath.length)
  const activeSection = activePortal.sections.find((s) => s.path === relativePath)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <span className="font-medium text-text-secondary">{activePortal.label}</span>
      {activeSection && activeSection.path !== '' && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-text-quaternary" />
          <span className="text-text-primary">{activeSection.label}</span>
        </>
      )}
    </nav>
  )
}

export function AppShell() {
  const { state: { collapsed }, actions: { openMobile, toggleCollapsed } } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-background-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-secondary bg-background-secondary px-4 lg:hidden">
          <IconButton aria-controls="app-sidebar" icon={<Menu className="h-5 w-5" />} label="Open navigation" onClick={openMobile} variant="ghost" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background-brand_solid text-xs font-bold text-static-white">
              M
            </div>
            <span className="text-sm font-semibold text-text-primary">MOC Console</span>
          </div>
        </header>

        {/* Desktop top bar with collapse toggle + breadcrumb */}
        <header className="hidden h-12 shrink-0 items-center gap-3 border-b border-border-secondary px-4 lg:flex">
          <IconButton
            icon={collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
            variant="ghost"
          />
          <Breadcrumb />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
