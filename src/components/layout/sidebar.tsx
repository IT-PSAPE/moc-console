import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeft, LogOut } from 'lucide-react'
import { useSidebar } from '@/contexts/sidebar-context'
import { usePortals } from '@/contexts/portal-context'
import { useAuth } from '@/contexts/auth-context'
import type { PortalConfig, PortalSection } from '@/types'

interface SidebarSectionLinkProps {
  section: PortalSection
  basePath: string
}

function SidebarSectionLink({ section, basePath }: SidebarSectionLinkProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { actions: { closeMobile } } = useSidebar()
  const sectionPath = basePath + section.path
  const active = location.pathname === sectionPath

  function handleClick() {
    navigate(sectionPath)
    closeMobile()
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
        active
          ? 'bg-background-brand_primary text-foreground-brand_primary font-medium'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {section.label}
    </button>
  )
}

interface PortalGroupProps {
  portal: PortalConfig
}

function PortalGroup({ portal }: PortalGroupProps) {
  const { state: { expandedPortal, collapsed }, actions: { togglePortal, closeMobile } } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const expanded = expandedPortal === portal.id
  const isActive = location.pathname.startsWith(portal.basePath)
  const Icon = portal.icon

  function handleClick() {
    if (collapsed) {
      navigate(portal.basePath + (portal.sections[0]?.path ?? ''))
      closeMobile()
      return
    }
    togglePortal(portal.id)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-background-secondary_hover text-text-primary'
            : 'text-text-tertiary hover:bg-background-primary_hover hover:text-text-secondary'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{portal.label}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {!collapsed && expanded && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-border-tertiary pl-3">
          {portal.sections.map((section) => (
            <SidebarSectionLink key={section.id} section={section} basePath={portal.basePath} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { state: { collapsed, mobileOpen }, actions: { toggleCollapsed, closeMobile } } = useSidebar()
  const { state: { portals } } = usePortals()
  const { state: { user }, actions: { logout } } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background-overlay/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`
          sidebar-transition fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-secondary bg-background-secondary
          lg:static lg:z-auto lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-64 lg:w-16' : 'w-64'}
        `}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border-secondary px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-brand_solid text-sm font-bold text-static-white">
            M
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="overflow-hidden lg:block" style={{ display: collapsed && !mobileOpen ? 'none' : undefined }}>
              <p className="truncate text-sm font-semibold text-text-primary">MOC Console</p>
              <p className="truncate text-xs text-text-tertiary">Admin Platform</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {portals.map((portal) => (
            <PortalGroup key={portal.id} portal={portal} />
          ))}
        </nav>

        <div className="border-t border-border-secondary p-3">
          {(!collapsed || mobileOpen) && user && (
            <div className="mb-3 rounded-lg bg-background-tertiary px-3 py-2">
              <p className="truncate text-sm font-medium text-text-primary">{user.full_name}</p>
              <p className="truncate text-xs text-text-tertiary">{user.role}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCollapsed}
              className="hidden flex-1 items-center justify-center rounded-lg p-2 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary lg:flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              onClick={logout}
              className="flex-1 rounded-lg p-2 text-text-tertiary hover:bg-background-secondary_hover hover:text-foreground-error_primary lg:flex-none"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
