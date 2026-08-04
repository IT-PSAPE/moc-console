import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useSidebar } from "@moc/ui/components/navigation/sidebar"

export function useAppShell() {
  const { pathname } = useLocation()
  const sidebar = useSidebar()
  const { closeMobile, setMobileOpen } = sidebar.actions
  const { signOut } = useAuth()
  const { toast } = useFeedback()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [reportBugOpen, setReportBugOpen] = useState(false)

  useEffect(() => {
    closeMobile()
  }, [closeMobile, pathname])

  const signOutUser = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const result = await signOut()
      closeMobile()
      if (result.error) toast({ title: "Logged out locally", description: result.error.message, variant: "info" })
    } finally {
      window.location.replace(`/${routes.login}`)
    }
  }, [closeMobile, isSigningOut, signOut, toast])

  function isRouteActive(route: string) {
    return pathname === `/${route}` || pathname.startsWith(`/${route}/`)
  }

  function openReportBug() {
    setReportBugOpen(true)
  }

  function openProfile() {
    closeMobile()
    setProfileOpen(true)
  }

  return {
    state: { isSigningOut, profileOpen, reportBugOpen, mobileSidebarOpen: sidebar.state.isMobileOpen },
    actions: { isRouteActive, signOut: signOutUser, openProfile, setProfileOpen, openReportBug, setReportBugOpen, closeMobileSidebar: closeMobile, setMobileSidebarOpen: setMobileOpen },
  }
}
