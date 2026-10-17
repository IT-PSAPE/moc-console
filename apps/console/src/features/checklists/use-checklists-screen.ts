import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Checklist } from '@moc/types/checklists'
import { routes } from '@/screens/console-routes'
import type { ChecklistRunSubmit } from './use-create-checklist-run'
import { useChecklists } from './checklists-provider'
import { partitionChecklistRuns } from './run-status'
import { useListDetailSelection } from '@/hooks/use-list-detail-selection'
import { useQueryText } from '@/hooks/use-query-text'

function matchesSearch(checklist: Checklist, query: string) {
    if (!query) return true
    return checklist.name.toLowerCase().includes(query) || checklist.description.toLowerCase().includes(query)
}

export function useChecklistsScreen() {
    const { state: checklistState, actions: checklistActions } = useChecklists()
    const { loadChecklists, createChecklistInstance, createBlankChecklist } = checklistActions
    const navigate = useNavigate()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalTemplate, setModalTemplate] = useState<Checklist | null>(null)
    const [search, setSearch] = useQueryText()
    const templates = useMemo(() => checklistState.checklists.filter((checklist) => checklist.kind === 'template'), [checklistState.checklists])
    const runs = useMemo(() => checklistState.checklists.filter((checklist) => checklist.kind === 'instance'), [checklistState.checklists])
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()
        return runs.filter((checklist) => matchesSearch(checklist, query))
    }, [runs, search])
    const groups = useMemo(() => partitionChecklistRuns(filtered), [filtered])
    const detail = useListDetailSelection<Checklist>(runs)
    const { close: closeDetail, select: selectChecklist } = detail.actions

    useEffect(() => { void loadChecklists() }, [loadChecklists])

    const pickBlank = useCallback(() => {
        setModalTemplate(null)
        setModalOpen(true)
    }, [])

    const pickTemplate = useCallback((template: Checklist) => {
        setModalTemplate(template)
        setModalOpen(true)
    }, [])

    const submit = useCallback(async (input: ChecklistRunSubmit) => {
        if (input.kind === 'template') await createChecklistInstance(input.template, { name: input.name, description: input.description })
        else await createBlankChecklist({ name: input.name, description: input.description })
    }, [createBlankChecklist, createChecklistInstance])

    const openTemplates = useCallback(() => navigate(`/${routes.checklistTemplates}`), [navigate])

    return {
        state: { modalOpen, modalTemplate, templates, active: groups.active, completed: groups.completed, detailOpen: detail.state.isOpen, selectedChecklist: detail.state.selectedItem, isLoading: checklistState.isLoadingChecklists, isInitialLoading: checklistState.isInitialLoadingChecklists, search },
        actions: { closeDetail, selectChecklist, setModalOpen, pickBlank, pickTemplate, submit, openTemplates, setSearch },
        meta: { filtered },
    }
}
