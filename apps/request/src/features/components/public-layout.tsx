import { cn } from '@moc/utils/cn'
import { useNavigate, useLocation } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@moc/ui/components/display/text';
import { Button } from '@moc/ui/components/controls/button';
import { SkipLink } from '@moc/ui/components/navigation/skip-link';

export function PublicLayout({ children, className}: { children: ReactNode; className?: string}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === routes.publicHome

  function handleHome() {
    navigate(routes.publicHome)
  }

  return (
    <div className="min-h-dvh bg-primary flex flex-col">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-secondary bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-content-md items-center px-page-gutter">
          <Button.Unstyled type="button" className="flex items-center gap-2 cursor-pointer" onClick={handleHome}>
            <div className="size-10 shrink-0 rounded-xl bg-linear-to-t from-utility-brand-600 to-utility-brand-400" >
              <img src="/logo.svg" alt="" width="40" height="40" className="size-10" />
            </div>
            <Label.bg>MOC Request</Label.bg>
          </Button.Unstyled>
          {!isHome && (
            <Button.Icon variant="ghost" icon={<X className="size-6" />} onClick={handleHome} className="ml-auto" aria-label="Go to home page" />
          )}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={cn('mx-auto w-full max-w-content-md flex-1 px-page-gutter outline-none', className)}>
        {children}
      </main>
    </div>
  )
}
