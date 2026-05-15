import { cn } from '@moc/utils/cn'
import { useNavigate, useLocation } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@moc/ui/components/display/text';

export function PublicLayout({ children, className}: { children: ReactNode; className?: string}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === routes.publicHome

  function handleHome() {
    navigate(routes.publicHome)
  }

  return (
    <div className="min-h-dvh bg-primary flex flex-col">
      <header className="sticky top-0 z-30 border-b border-secondary bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-content-md items-center px-4 sm:px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleHome} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleHome() }}>
            <div className="size-10 shrink-0 rounded-xl bg-linear-to-t from-utility-brand-600 to-utility-brand-400" >
              <img src="/logo.svg" alt="" className="size-10" />
            </div>
            <Label.bg>MOC Request</Label.bg>
          </div>
          {!isHome && (
            <button type="button" onClick={handleHome} className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-secondary hover:bg-secondary hover:text-brand_teriary transition-colors cursor-pointer" aria-label="Go to home page">
              <X className="size-6" />
            </button>
          )}
        </div>
      </header>
      <div className={cn('mx-auto w-full max-w-content-md flex-1 px-4', className)}>
        {children}
      </div>
    </div>
  )
}
