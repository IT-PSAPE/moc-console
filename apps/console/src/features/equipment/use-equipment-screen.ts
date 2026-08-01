import { useCallback, useEffect, useState } from 'react'
import { createEquipment } from '@/data/mutate-equipment'
import { useViewQuery } from '@/hooks/use-view-query'
import { randomId } from '@moc/utils/random-id'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import type { Equipment, EquipmentCategory } from '@moc/types/equipment'
import { useEquipment } from './equipment-provider'
import { useEquipmentFilters } from './use-equipment-filters'

const equipmentViews = ['list', 'table', 'kanban'] as const

type NewEquipment = {
  name: string
  serialNumber: string
  category: EquipmentCategory
  location: string
}

export function useEquipmentScreen() {
  const [view, setView] = useViewQuery(equipmentViews, 'list')
  const isMobile = useIsMobile()
  const { state: equipmentState, actions: equipmentActions } = useEquipment()
  const { loadEquipment, addEquipment } = equipmentActions
  const { toast } = useFeedback()
  const [createOpen, setCreateOpen] = useState(false)
  const filters = useEquipmentFilters(equipmentState.equipment)
  const activeView = isMobile && (view === 'table' || view === 'kanban') ? 'list' : view

  useEffect(() => { void loadEquipment() }, [loadEquipment])

  const create = useCallback(async ({ name, serialNumber, category, location }: NewEquipment) => {
    const equipment: Equipment = { id: randomId(), name, serialNumber, category, status: 'available', location, notes: '', lastActiveDate: new Date().toISOString(), bookedBy: null, thumbnail: null }
    try {
      const saved = await createEquipment(equipment)
      addEquipment(saved)
      setCreateOpen(false)
      toast({ title: 'Equipment added', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to add equipment', description: getErrorMessage(error, 'The equipment item could not be added.'), variant: 'error' })
    }
  }, [addEquipment, toast])

  function changeView(nextView: string) {
    setView(nextView)
  }

  function openCreate() {
    setCreateOpen(true)
  }

  return {
    state: { activeView, isMobile, createOpen, isLoading: equipmentState.isLoadingEquipment, filtered: filters.filtered, filterState: filters.filters },
    actions: { changeView, setCreateOpen, openCreate, create, setSearch: filters.setSearch },
    meta: { filters },
  }
}
