import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { Sidebar as SidebarChrome } from '@/components/ui/sidebar'
import { useSidebar } from '@/contexts/sidebar-context'
import { usePortals } from '@/contexts/portal-context'
import { useAuth } from '@/contexts/auth-context'
import type { PortalConfig, PortalSection } from '@/types'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state: { collapsed, expandedPortal, mobileOpen }, actions: { closeMobile, togglePortal } } = useSidebar()
  const { state: { portals } } = usePortals()
  const { state: { user }, actions: { logout } } = useAuth()
  const showLabels = !collapsed || mobileOpen

  function getPortalPath(portal: PortalConfig) {
    return portal.basePath + (portal.sections[0]?.path ?? '')
  }

  function getSectionPath(portal: PortalConfig, section: PortalSection) {
    return portal.basePath + section.path
  }

  function isPortalActive(portal: PortalConfig) {
    return location.pathname.startsWith(portal.basePath)
  }

  function isSectionActive(portal: PortalConfig, section: PortalSection) {
    return location.pathname === getSectionPath(portal, section)
  }

  function handleSectionClick(sectionPath: string) {
    navigate(sectionPath)
    closeMobile()
  }

  function handlePortalClick(portal: PortalConfig) {
    if (collapsed) {
      navigate(getPortalPath(portal))
      closeMobile()
      return
    }

    togglePortal(portal.id)
  }

  function renderSection(portal: PortalConfig, section: PortalSection) {
    const sectionPath = getSectionPath(portal, section)

    function handleClick() {
      handleSectionClick(sectionPath)
    }

    return (
      <SidebarChrome.Item active={isSectionActive(portal, section)} key={section.id} onClick={handleClick}>
        {section.label}
      </SidebarChrome.Item>
    )
  }

  function renderPortal(portal: PortalConfig) {
    const Icon = portal.icon
    const expanded = expandedPortal === portal.id

    function handleClick() {
      handlePortalClick(portal)
    }

    return (
      <SidebarChrome.Group key={portal.id}>
        <SidebarChrome.MenuButton active={isPortalActive(portal)} onClick={handleClick}>
          <Icon className="h-5 w-5 shrink-0" />
          <SidebarChrome.Reveal className="flex flex-1 items-center gap-3">
            <span className="flex-1 text-left">{portal.label}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </SidebarChrome.Reveal>
        </SidebarChrome.MenuButton>
        <SidebarChrome.GroupContent open={expanded}>
          {portal.sections.map((section) => renderSection(portal, section))}
        </SidebarChrome.GroupContent>
      </SidebarChrome.Group>
    )
  }

  return (
    <SidebarChrome.Root collapsed={collapsed} mobileOpen={mobileOpen}>
      <SidebarChrome.Backdrop onClick={closeMobile} />
      <SidebarChrome.Panel id="app-sidebar">
        <SidebarChrome.Header>
          <SidebarChrome.Brand>
            <SidebarChrome.BrandMark>M</SidebarChrome.BrandMark>
            <SidebarChrome.Reveal className="min-w-0 overflow-hidden">
              <p className="truncate text-base font-semibold text-text-primary">MOC Console</p>
              <p className="truncate text-xs text-text-tertiary">Admin Platform</p>
            </SidebarChrome.Reveal>
          </SidebarChrome.Brand>
        </SidebarChrome.Header>

        <SidebarChrome.Content>
          <SidebarChrome.Menu>
            {portals.map(renderPortal)}
          </SidebarChrome.Menu>
        </SidebarChrome.Content>

        <SidebarChrome.Footer>
          {showLabels && user ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{user.full_name}</p>
                <p className="truncate text-xs text-text-tertiary">{user.role}</p>
              </div>
              <IconButton icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={logout} variant="ghost" />
            </div>
          ) : (
            <IconButton icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={logout} variant="ghost" />
          )}
        </SidebarChrome.Footer>
      </SidebarChrome.Panel>
    </SidebarChrome.Root>
  )
}
