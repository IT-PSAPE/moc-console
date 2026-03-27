import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { IconButton } from '@/components/ui/icon-button'
import { useSidebar } from '@/contexts/sidebar-context'

export function AppShell() {
  const { actions: { openMobile } } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-background-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar — hidden on lg+ where sidebar is always visible */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-secondary bg-background-secondary px-4 lg:hidden">
          <IconButton aria-controls="app-sidebar" icon={<Menu className="h-5 w-5" />} label="Open navigation" onClick={openMobile} variant="ghost" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background-brand_solid text-xs font-bold text-static-white">
              M
            </div>
            <span className="text-sm font-semibold text-text-primary">MOC Console</span>
          </div>
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
