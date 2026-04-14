import { cn } from '@/utils/cn'
import { useNavigate, useLocation } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { Home } from 'lucide-react'
import type { ReactNode } from 'react'

export function PublicLayout({ children, className }: { children: ReactNode; className?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === routes.publicHome

  function handleHome() {
    navigate(routes.publicHome)
  }

  return (
    <div className="min-h-dvh bg-primary flex flex-col">
      <header className="sticky top-0 z-30 border-b border-secondary bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleHome} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleHome() }}>
            <div className="size-8 shrink-0 rounded-lg bg-brand_solid" />
            <span className="label-sm">MOC Request</span>
          </div>
          {!isHome && (
            <button type="button" onClick={handleHome} className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-secondary hover:bg-secondary hover:text-primary transition-colors cursor-pointer" aria-label="Go to home page">
              <Home className="size-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}
        </div>
      </header>

      <div className={cn('mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12', className)}>
        {children}
      </div>
    </div>
  )
}
