import { useSearchParams } from "react-router-dom"
import { useWorkspace } from "@/lib/workspace-context"

export type SettingsTab = "general" | "members" | "request-options" | "telegram" | "streams" | "automation"

export const settingsTabLabel: Record<SettingsTab, string> = {
  automation: "Automation",
  general: "General",
  members: "Members",
  "request-options": "Request options",
  streams: "Streaming",
  telegram: "Telegram",
}

export function useSettingsScreen() {
  const { role } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManage = role?.can_manage_roles === true
  const canEdit = role?.can_update === true
  const tabs: SettingsTab[] = canManage ? ["general", "members", "request-options", "telegram", "streams", "automation"] : canEdit ? ['general','members'] : ["general"]
  const tabParam = searchParams.get("tab")
  // Keep existing bookmarks for these settings pointing at the combined view.
  const resolvedTab = ["venues", "events", "request-categories"].includes(tabParam ?? "") ? "request-options" : tabParam
  const requestedTab = (resolvedTab === "workspace" ? "general" : resolvedTab) as SettingsTab | null
  const requestedTabIsAvailable = requestedTab !== null && tabs.includes(requestedTab)
  const activeTab: SettingsTab = requestedTabIsAvailable ? requestedTab : "general"

  function selectTab(value: string): void {
    if (!tabs.includes(value as SettingsTab)) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("tab", value)
    setSearchParams(nextParams)
  }

  return {
    actions: { selectTab },
    meta: {
      activeTab,
      canManage,
      tabs,
    },
  }
}
