import { useEffect, useMemo, useState } from "react"
import { updateWorkspace } from "@/data/mutate-workspace"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useWorkspaceSettings() {
  const { workspaces, currentWorkspaceId, refresh, role } = useWorkspace()
  const { toast } = useFeedback()
  const workspace = useMemo(
    () => workspaces.find((item) => item.id === currentWorkspaceId) ?? null,
    [currentWorkspaceId, workspaces],
  )
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const canManage = role?.can_manage_roles === true

  useEffect(() => {
    if (!workspace) return
    setName(workspace.name)
  }, [workspace])

  const trimmedName = name.trim()
  const hasChanges = workspace ? trimmedName !== workspace.name : false
  const canSave = Boolean(canManage && hasChanges && trimmedName && !isSaving)

  async function save() {
    if (!workspace || !canSave) return
    setIsSaving(true)
    try {
      await updateWorkspace(workspace.id, {
        name: trimmedName,
      })
      await refresh()
      toast({ title: "Workspace updated", variant: "success" })
    } catch (error) {
      toast({
        title: "Could not update workspace",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  function discard() {
    if (!workspace) return
    setName(workspace.name)
  }

  return {
    state: { name, isSaving },
    actions: { setName, save, discard },
    meta: { workspace, canManage, hasChanges, canSave },
  }
}
