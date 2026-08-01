import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"

export type SettingsTab = "profile" | "workspace" | "telegram" | "streams" | "automation"

export const settingsTabLabel: Record<SettingsTab, string> = {
  automation: "Automation",
  profile: "Profile",
  streams: "Streaming",
  telegram: "Telegram",
  workspace: "Workspace & members",
}

export function getSettingsHref(tab: SettingsTab): string {
  return `/account/settings?tab=${tab}`
}

export function useSettingsScreen() {
  const { role } = useAuth()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const canManage = role?.can_manage_roles === true
  const tabs: SettingsTab[] = canManage ? ["profile", "workspace", "telegram", "streams", "automation"] : ["profile"]
  const requestedTab = searchParams.get("tab") as SettingsTab | null
  const requestedTabIsAvailable = requestedTab !== null && tabs.includes(requestedTab)
  const activeTab: SettingsTab = requestedTabIsAvailable ? requestedTab : "profile"

  return {
    meta: {
      activeTab,
      canManage,
      isMobile,
      requestedTabIsAvailable,
      showMobileIndex: isMobile && !requestedTabIsAvailable,
      tabs,
    },
  }
}
