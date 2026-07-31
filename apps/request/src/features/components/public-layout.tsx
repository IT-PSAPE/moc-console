import { cn } from '@moc/utils/cn'
import { useNavigate, useLocation } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@moc/ui/components/display/text';
import { Button } from '@moc/ui/components/controls/button';

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
          <Button.Unstyled type="button" className="flex items-center gap-2 cursor-pointer" onClick={handleHome}>
            <div className="size-10 shrink-0 rounded-xl bg-linear-to-t from-utility-brand-600 to-utility-brand-400" >
              <img src="/logo.svg" alt="" className="size-10" />
            </div>
            <Label.bg>MOC Request</Label.bg>
          </Button.Unstyled>
          {!isHome && (
            <Button.Icon variant="ghost" icon={<X className="size-6" />} onClick={handleHome} className="ml-auto" aria-label="Go to home page" />
          )}
        </div>
      </header>
      <div className={cn('mx-auto w-full max-w-content-md flex-1 px-4', className)}>
        {children}
      </div>
    </div>
  )
}
