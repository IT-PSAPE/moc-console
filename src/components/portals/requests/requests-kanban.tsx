import { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { StatusBadge } from '@/components/ui/status-badge'
import { RequestDetailPanel } from './request-detail-panel'
import { useUpdateRequestStatus } from '@/hooks/use-requests'
import { formatDate } from '@/lib/utils'
import type { CultureRequest, RequestFlow } from '@/types'

const COLUMNS: { id: RequestFlow; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_review', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
]

interface KanbanCardProps {
  request: CultureRequest
  onClick: () => void
}

function KanbanCard({ request, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: request.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`rounded-lg border border-border-primary bg-background-primary p-3 shadow-sm cursor-pointer select-none transition-colors hover:border-border-brand ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="mb-2 line-clamp-2 text-sm font-medium text-text-primary">{request.title}</p>
      <p className="mb-2 text-xs text-text-tertiary">{request.who}</p>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={request.priority} />
        {request.due_date && (
          <span className="shrink-0 text-xs text-text-quaternary">{formatDate(request.due_date)}</span>
        )}
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: { id: RequestFlow; label: string }
  requests: CultureRequest[]
  onCardClick: (r: CultureRequest) => void
}

function KanbanColumn({ column, requests, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex w-64 shrink-0 flex-col lg:w-auto lg:min-w-0 lg:flex-1">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">{column.label}</span>
        <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs font-medium text-text-tertiary">
          {requests.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-32 flex-1 space-y-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
          isOver
            ? 'border-border-brand bg-background-brand_primary'
            : 'border-border-tertiary bg-background-secondary'
        }`}
      >
        {requests.map((req) => {
          function handleClick() {
            onCardClick(req)
          }
          return <KanbanCard key={req.id} request={req} onClick={handleClick} />
        })}
      </div>
    </div>
  )
}

interface RequestsKanbanProps {
  requests: CultureRequest[]
}

export function RequestsKanban({ requests }: RequestsKanbanProps) {
  const { mutate: updateStatus } = useUpdateRequestStatus()
  const [selected, setSelected] = useState<CultureRequest | null>(null)
  const [dragging, setDragging] = useState<CultureRequest | null>(null)

  function handleDragStart(event: DragStartEvent) {
    const req = requests.find((r) => r.id === event.active.id)
    setDragging(req ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null)
    const { active, over } = event
    if (!over) return
    const req = requests.find((r) => r.id === active.id)
    if (!req || req.status === over.id) return
    updateStatus({ id: req.id, status: over.id as RequestFlow })
  }

  function handleClosePanel() {
    setSelected(null)
  }

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              requests={requests.filter((r) => r.status === col.id)}
              onCardClick={setSelected}
            />
          ))}
        </div>
        <DragOverlay>
          {dragging && (
            <div className="w-56 rotate-2 rounded-lg border border-border-brand bg-background-primary p-3 shadow-lg">
              <p className="line-clamp-2 text-sm font-medium text-text-primary">{dragging.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <RequestDetailPanel selected={selected} onClose={handleClosePanel} />
    </>
  )
}
