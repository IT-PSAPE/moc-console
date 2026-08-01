import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useChecklists } from "@/features/checklists/checklists-provider"
import { getChecklistCounts } from "@/features/checklists/checklist-content"
import type { ChecklistAddRequest } from "@/features/checklists/checklist-types"
import { routes } from "@/screens/console-routes"
import type { Checklist } from "@moc/types/checklists"

export function useChecklistDetail() {
  const { id } = useParams<{ id: string }>()
  const {
    state: { checklists, isLoadingChecklists },
    actions: { loadChecklists, syncChecklist, removeChecklist },
  } = useChecklists()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const [addRequest, setAddRequest] = useState<ChecklistAddRequest>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const checklist = checklists.find((item) => item.id === id) ?? null
  const counts = checklist ? getChecklistCounts(checklist) : { total: 0, checked: 0 }

  useBreadcrumbOverride(id ?? "", checklist?.name)

  useEffect(() => {
    void loadChecklists()
  }, [loadChecklists])

  const update = useCallback(async (nextChecklist: Checklist) => {
    try {
      await syncChecklist(nextChecklist)
    } catch (error) {
      toast({ title: "Failed to save checklist", description: error instanceof Error ? error.message : "The checklist could not be saved.", variant: "error" })
    }
  }, [syncChecklist, toast])

  function updateName(name: string) {
    if (checklist) void update({ ...checklist, name })
  }

  function updateDescription(description: string) {
    if (checklist) void update({ ...checklist, description })
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
    actions: { setDeleteOpen, openDelete, addItem, addSection, dismissAdd, update, updateName, updateDescription, remove },
    meta: { checklist, counts, isLoading: isLoadingChecklists },
  }
}
