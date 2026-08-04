import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useChecklists } from "@/features/checklists/checklists-provider"
import { getChecklistCounts } from "@/features/checklists/checklist-content"
import type { ChecklistAddRequest } from "@/features/checklists/checklist-types"
import { routes } from "@/screens/console-routes"
import type { Checklist } from "@moc/types/checklists"
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time"
import { useChecklistRequestLink } from "@/features/checklists/use-checklist-request-link";
import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { useWorkspace } from "@/lib/workspace-context";

export function useChecklistDetail() {
  const { id } = useParams<{ id: string }>()
  const { currentWorkspaceId } = useWorkspace()
  const generation = getCurrentWorkspaceGeneration()
  const {
    state: { checklists, checklistsError, isLoadingChecklists },
    actions: { createChecklistTemplateFromRun, loadChecklists, retryChecklists, syncChecklist, removeChecklist },
  } = useChecklists()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const [addRequest, setAddRequest] = useState<ChecklistAddRequest>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const currentKey = `${currentWorkspaceId ?? "none"}:${generation}:${id ?? "none"}`
  const checklist = checklists.find((item) => item.id === id) ?? null
  const counts = checklist ? getChecklistCounts(checklist) : { total: 0, checked: 0 }
  const scheduledAtInput = checklist?.kind === "instance" && checklist.scheduledAt ? formatUtcIsoForBrowserDateTimeInput(checklist.scheduledAt) : ""

  useBreadcrumbOverride(id ?? "", checklist?.name)

  useEffect(() => {
    if (!id || !currentWorkspaceId) return

    let cancelled = false
    const requestedKey = `${currentWorkspaceId}:${generation}:${id}`

    void loadChecklists().then(() => {
      if (!cancelled) setLoadedKey(requestedKey)
    })

    return () => {
      cancelled = true
    }
  }, [currentWorkspaceId, generation, id, loadChecklists])

  const update = useCallback(async (nextChecklist: Checklist) => {
    try {
      await syncChecklist(nextChecklist)
    } catch (error) {
      toast({ title: "Failed to save checklist", description: error instanceof Error ? error.message : "The checklist could not be saved.", variant: "error" })
    }
  }, [syncChecklist, toast])
  const requestLink = useChecklistRequestLink(checklist, update)

  function updateName(name: string) {
    if (checklist) void update({ ...checklist, name })
  }

  function updateDescription(description: string) {
    if (checklist) void update({ ...checklist, description })
  }

  function updateScheduledAt(value: string) {
    if (checklist?.kind === "instance" && value) void update({ ...checklist, scheduledAt: parseBrowserDateTimeInputToUtcIso(value) })
  }

  async function remove() {
    if (!id || !checklist) return
    try {
      await removeChecklist(id)
      toast({ title: "Checklist deleted", variant: "success" })
      navigate(`/${checklist.kind === "template" ? routes.checklistTemplates : routes.checklists}`)
    } catch (error) {
      toast({ title: "Failed to delete checklist", description: error instanceof Error ? error.message : "The checklist could not be deleted.", variant: "error" })
    }
  }

  function openDelete() {
    setDeleteOpen(true)
  }

  async function createTemplate() {
    if (!checklist || checklist.kind !== "instance") return
    try {
      await createChecklistTemplateFromRun(checklist)
      toast({ title: "Checklist template created", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to create checklist template", description: error instanceof Error ? error.message : "The checklist template could not be created.", variant: "error" })
    }
  }

  function addItem() {
    setAddRequest({ type: "item", target: "top" })
  }

  function addSection() {
    setAddRequest({ type: "section" })
  }

  function dismissAdd() {
    setAddRequest(null)
  }

  return {
    state: { addRequest, deleteOpen },
    actions: { setDeleteOpen, openDelete, createTemplate, addItem, addSection, dismissAdd, update, updateName, updateDescription, updateScheduledAt, remove },
    meta: {
      checklist,
      counts,
      requestLink,
      scheduledAtInput,
      error: loadedKey === currentKey ? checklistsError : null,
      isLoading: Boolean(!checklist && id && currentWorkspaceId && (isLoadingChecklists || loadedKey !== currentKey)),
      retry: retryChecklists,
    },
  }
}
