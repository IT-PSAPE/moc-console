import { KanbanBoard } from '@moc/ui/components/display/kanban-board'
import type { Equipment } from '@moc/types/equipment'
import { EquipmentItem } from './equipment-item'
import { useKanbanDrawerState } from '@/hooks/use-kanban-drawer-state'

export function DraggableEquipmentItem({ equipment }: { equipment: Equipment }) {
  const drawer = useKanbanDrawerState()
  return (
    <KanbanBoard.Item id={equipment.id} data={{ equipment }} disabled={drawer.state.isDrawerOpen}>
      <EquipmentItem equipment={equipment} onDrawerOpenChange={drawer.actions.setDrawerOpen} />
    </KanbanBoard.Item>
  )
}
