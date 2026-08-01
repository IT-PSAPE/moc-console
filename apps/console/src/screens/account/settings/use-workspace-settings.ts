import { useEffect, useMemo, useState } from "react"
import { updateWorkspace } from "@/data/mutate-workspace"
import { useAuth } from "@/lib/auth-context"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function useWorkspaceSettings() {
  const { role } = useAuth()
  const { workspaces, currentWorkspaceId, refresh } = useWorkspace()
  const { toast } = useFeedback()
  const workspace = useMemo(
    () => workspaces.find((item) => item.id === currentWorkspaceId) ?? null,
    [currentWorkspaceId, workspaces],
  )
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const canManage = role?.can_manage_roles === true

  useEffect(() => {
    if (!workspace) return
    setName(workspace.name)
    setSlug(workspace.slug)
    setDescription(workspace.description ?? "")
  }, [workspace])

  const trimmedName = name.trim()
  const trimmedSlug = slug.trim()
  const trimmedDescription = description.trim()
  const hasChanges = workspace
    ? trimmedName !== workspace.name
      || trimmedSlug !== workspace.slug
      || trimmedDescription !== (workspace.description ?? "")
    : false
  const slugValid = SLUG_PATTERN.test(trimmedSlug)
  const canSave = Boolean(canManage && hasChanges && trimmedName && slugValid && !isSaving)

  async function save() {
    if (!workspace || !canSave) return
    setIsSaving(true)
    try {
      await updateWorkspace(workspace.id, {
        name: trimmedName,
        slug: trimmedSlug,
        description: trimmedDescription || null,
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
    setSlug(workspace.slug)
    setDescription(workspace.description ?? "")
  }

  return {
    state: { name, slug, description, isSaving },
    actions: { setName, setSlug, setDescription, save, discard },
    meta: { workspace, canManage, hasChanges, slugValid, canSave, trimmedSlug },
  }
}
