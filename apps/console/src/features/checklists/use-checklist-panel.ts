import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { Checklist } from '@moc/types/checklists'
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from '@moc/utils/browser-date-time'
import { getChecklistCounts } from './checklist-content'
import type { ChecklistAddRequest } from './checklist-types'
import { useChecklists } from './checklists-provider'

export function useChecklistPanel(checklist: Checklist, onClose: () => void) {
  const { actions: { syncChecklist, removeChecklist } } = useChecklists()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const [addRequest, setAddRequest] = useState<ChecklistAddRequest>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const counts = getChecklistCounts(checklist)
  const scheduledAtInput = checklist.kind === 'instance' && checklist.scheduledAt ? formatUtcIsoForBrowserDateTimeInput(checklist.scheduledAt) : ''

  const update = useCallback(async (nextChecklist: Checklist) => {
    try {
      await syncChecklist(nextChecklist)
    } catch (error) {
      toast({ title: 'Failed to save checklist', description: error instanceof Error ? error.message : 'The checklist could not be saved.', variant: 'error' })
    }
  }, [syncChecklist, toast])

  function openFullPage() {
    onClose()
    navigate(`/checklists/${checklist.id}`)
  }

  function updateName(name: string) { void update({ ...checklist, name }) }
  function updateDescription(description: string) { void update({ ...checklist, description }) }
  function updateScheduledAt(value: string) {
    if (checklist.kind === 'instance' && value) void update({ ...checklist, scheduledAt: parseBrowserDateTimeInputToUtcIso(value) })
  }
  function updateChecklist(nextChecklist: Checklist) { void update(nextChecklist) }
  function addItem() { setAddRequest({ type: 'item', target: 'top' }) }
  function addSection() { setAddRequest({ type: 'section' }) }
  function dismissAdd() { setAddRequest(null) }
  function openDelete() { setDeleteOpen(true) }

  async function remove() {
    try {
      await removeChecklist(checklist.id)
      toast({ title: 'Checklist deleted', variant: 'success' })
      setDeleteOpen(false)
      onClose()
    } catch (error) {
      toast({ title: 'Failed to delete checklist', description: error instanceof Error ? error.message : 'The checklist could not be deleted.', variant: 'error' })
    }
  }

  return {
    state: { addRequest, deleteOpen },
    actions: { addItem, addSection, close: onClose, dismissAdd, openDelete, openFullPage, remove, setDeleteOpen, updateDescription, updateChecklist, updateName, updateScheduledAt },
    meta: { ...counts, scheduledAtInput },
  }
}
