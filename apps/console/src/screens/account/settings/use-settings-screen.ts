import { useSearchParams } from "react-router-dom"
import { useWorkspace } from "@/lib/workspace-context"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"

export type SettingsTab = "general" | "members" | "telegram" | "streams" | "automation"

export const settingsTabLabel: Record<SettingsTab, string> = {
  automation: "Automation",
  general: "General",
  members: "Members",
  streams: "Streaming",
  telegram: "Telegram",
}

export function getSettingsHref(tab: SettingsTab): string {
  return `/account/settings?tab=${tab}`
}

export function useSettingsScreen() {
  const { role } = useWorkspace()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const canManage = role?.can_manage_roles === true
  const tabs: SettingsTab[] = canManage ? ["general", "members", "telegram", "streams", "automation"] : ["general"]
  const tabParam = searchParams.get("tab")
  const requestedTab = (tabParam === "workspace" ? "general" : tabParam) as SettingsTab | null
  const requestedTabIsAvailable = requestedTab !== null && tabs.includes(requestedTab)
  const activeTab: SettingsTab = requestedTabIsAvailable ? requestedTab : "general"

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
