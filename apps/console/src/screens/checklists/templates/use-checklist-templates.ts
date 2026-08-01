import { useCallback, useEffect, useMemo, useState } from "react"
import { useChecklists } from "@/features/checklists/checklists-provider"
import { randomId } from "@moc/utils/random-id"
import type { Checklist } from "@moc/types/checklists"

export function useChecklistTemplates() {
  const {
    state: { checklists, isLoadingChecklists },
    actions: { loadChecklists, syncChecklist },
  } = useChecklists()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    void loadChecklists()
  }, [loadChecklists])

  const templates = useMemo(() => checklists.filter((checklist) => checklist.kind === "template"), [checklists])
  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return templates
    return templates.filter((checklist) => checklist.name.toLowerCase().includes(query) || checklist.description.toLowerCase().includes(query))
  }, [search, templates])

  const create = useCallback(async ({ name, description }: { name: string; description: string }) => {
    const now = new Date().toISOString()
    const checklist: Checklist = {
      id: randomId(),
      kind: "template",
      name,
      description,
      items: [],
      sections: [],
      createdAt: now,
      updatedAt: now,
    }
    await syncChecklist(checklist)
    setModalOpen(false)
  }, [syncChecklist])

  function openCreate() {
    setModalOpen(true)
  }

  return {
    state: { search, modalOpen },
    actions: { setSearch, setModalOpen, openCreate, create },
    meta: { templates: filteredTemplates, isLoading: isLoadingChecklists },
  }
}
