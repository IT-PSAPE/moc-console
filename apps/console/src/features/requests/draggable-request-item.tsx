import { KanbanBoard } from '@moc/ui/components/display/kanban-board'
import type { Request } from '@moc/types/requests'
import { RequestItem } from './request-item'
import { useKanbanDrawerState } from '@/hooks/use-kanban-drawer-state'

export function DraggableRequestItem({ request }: { request: Request }) {
  const drawer = useKanbanDrawerState()
  return (
    <KanbanBoard.Item id={request.id} data={{ request }} disabled={drawer.state.isDrawerOpen}>
      <RequestItem request={request} vertical onDrawerOpenChange={drawer.actions.setDrawerOpen} />
    </KanbanBoard.Item>
  )
}
