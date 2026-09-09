import { useState } from 'react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'

type KanbanStatusOptions<Item extends { id: string }, Status extends string> = {
  dataKey: string
  getStatus: (item: Item) => Status
  setStatus: (item: Item, status: Status) => Item
  sync: (item: Item) => void
  persist: (id: string, status: Status) => Promise<unknown>
  statusLabel: (status: Status) => string
  errorMessage: string
}

export function useKanbanStatusChange<Item extends { id: string }, Status extends string>(options: KanbanStatusOptions<Item, Status>) {
  const { toast } = useFeedback()
  const [activeItem, setActiveItem] = useState<Item | null>(null)

  function getEventItem(event: DragStartEvent | DragEndEvent): Item | null {
    return (event.active.data.current?.[options.dataKey] as Item | undefined) ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveItem(getEventItem(event))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const item = getEventItem(event)
    if (!item || !event.over) return
    const status = event.over.id as Status
    if (options.getStatus(item) === status) return
    options.sync(options.setStatus(item, status))
    try {
      await options.persist(item.id, status)
      toast({ title: `Moved to ${options.statusLabel(status)}`, variant: 'success' })
    } catch (error) {
      options.sync(item)
      toast({ title: 'Failed to update status', description: getErrorMessage(error, options.errorMessage), variant: 'error' })
    }
  }

  return { state: { activeItem }, actions: { handleDragStart, handleDragEnd } }
}
