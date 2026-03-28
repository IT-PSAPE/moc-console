import { createContext, useContext, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { clsx } from '@/utils/cv'

interface SidebarRootState {
  collapsed: boolean
  mobileOpen: boolean
}

interface SidebarRootMeta {
  showLabels: boolean
}

interface SidebarContextValue {
  state: SidebarRootState
  actions: Record<string, never>
  meta: SidebarRootMeta
}

interface SidebarRootProps {
  children: ReactNode
  collapsed: boolean
  mobileOpen: boolean
}

interface SidebarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('Sidebar compound components must be used within Sidebar.Root')
  return context
}

function Root({ children, collapsed, mobileOpen }: SidebarRootProps) {
  return (
    <SidebarContext.Provider
      value={{
        state: { collapsed, mobileOpen },
        actions: {},
        meta: { showLabels: !collapsed || mobileOpen },
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

function Backdrop({ onClick }: { onClick: () => void }) {
  const { state: { mobileOpen } } = useSidebarContext()

  if (!mobileOpen) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-40 bg-background-overlay/60 backdrop-blur-sm lg:hidden"
      onClick={onClick}
    />
  )
}

function Panel({ children, className = '', id }: HTMLAttributes<HTMLElement>) {
  const { state: { collapsed, mobileOpen } } = useSidebarContext()

  return (
    <aside
      className={clsx(
        'sidebar-transition fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-secondary bg-background-secondary',
        'lg:static lg:z-auto lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-64 lg:w-16' : 'w-64',
        className,
      )}
      id={id}
    >
      {children}
    </aside>
  )
}

function Header({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('flex h-16 items-center gap-2.5 border-b border-border-secondary px-5', className)}>{children}</div>
}

function Brand({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('flex min-w-0 items-center gap-3', className)}>{children}</div>
}

function BrandMark({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-brand_solid text-sm font-bold text-static-white', className)}>
      {children}
    </div>
  )
}

function Reveal({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  const { meta: { showLabels } } = useSidebarContext()

  if (!showLabels) return null

  return <div className={className}>{children}</div>
}

function Content({ children, className = '' }: HTMLAttributes<HTMLElement>) {
  return <nav className={clsx('flex-1 space-y-1 overflow-y-auto p-3', className)}>{children}</nav>
}

function Group({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className}>{children}</div>
}

function GroupLabel({ children, className = '' }: HTMLAttributes<HTMLParagraphElement>) {
  useSidebarContext()
  return <p className={clsx('px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-text-quaternary', className)}>{children}</p>
}

function Menu({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('space-y-1', className)}>{children}</div>
}

function MenuButton({ active = false, children, className = '', type, ...props }: SidebarButtonProps) {
  return (
    <button
      className={clsx(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-background-brand_primary text-foreground-brand_primary'
          : 'text-text-secondary hover:bg-background-primary_hover hover:text-text-primary',
        className,
      )}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  )
}

function GroupContent({ children, className = '', open }: HTMLAttributes<HTMLDivElement> & { open: boolean }) {
  const { meta: { showLabels } } = useSidebarContext()

  if (!showLabels || !open) return null

  return <div className={clsx('ml-5 mt-1 space-y-0.5 border-l border-border-tertiary pl-3', className)}>{children}</div>
}

function Item({ active = false, children, className = '', type, ...props }: SidebarButtonProps) {
  return (
    <button
      className={clsx(
        'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-background-brand_primary font-medium text-foreground-brand_primary'
          : 'text-text-tertiary hover:text-text-secondary',
        className,
      )}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  )
}

function Footer({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('border-t border-border-secondary px-4 py-3', className)}>{children}</div>
}

function UserCard({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-3 rounded-lg bg-background-tertiary px-3 py-2', className)}>{children}</div>
}

function ActionRow({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('flex items-center gap-2', className)}>{children}</div>
}

export const Sidebar = {
  Root,
  Backdrop,
  Panel,
  Header,
  Brand,
  BrandMark,
  Reveal,
  Content,
  Group,
  GroupLabel,
  Menu,
  MenuButton,
  GroupContent,
  Item,
  Footer,
  UserCard,
  ActionRow,
}
