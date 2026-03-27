import { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { Tag, CalendarDays, PackageOpen } from 'lucide-react'
import { RequestDetailPanel } from './request-detail-panel'
import { useUpdateRequestStatus } from '@/hooks/use-requests'
import { formatLabel } from '@/lib/utils'
import type { CultureRequest, RequestFlow } from '@/types'

type KanbanStatus = 'not_started' | 'in_progress' | 'completed'

const STATUS_TO_KANBAN: Record<RequestFlow, KanbanStatus> = {
  pending: 'not_started',
  in_review: 'in_progress',
  approved: 'in_progress',
  rejected: 'completed',
  completed: 'completed',
}

const KANBAN_TO_STATUS: Record<KanbanStatus, RequestFlow> = {
  not_started: 'pending',
  in_progress: 'in_review',
  completed: 'completed',
}

const COLUMNS: { id: KanbanStatus; label: string; dot: string }[] = [
  { id: 'not_started', label: 'Not Started', dot: 'bg-utility-gray-400' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-utility-warning-500' },
  { id: 'completed', label: 'Completed', dot: 'bg-utility-success-500' },
]

const TYPE_STYLES: Record<string, string> = {
  equipment: 'text-utility-warning-700',
  event: 'text-utility-warning-700',
  program: 'text-utility-blue-700',
  venue: 'text-purple-700',
  media: 'text-utility-error-700',
  other: 'text-utility-gray-600',
}

const PRIORITY_STYLES: Record<string, { text: string; dot: string }> = {
  low: { text: 'text-utility-gray-600', dot: 'bg-utility-gray-400' },
  medium: { text: 'text-utility-blue-700', dot: 'bg-utility-blue-500' },
  high: { text: 'text-utility-warning-700', dot: 'bg-utility-warning-500' },
  urgent: { text: 'text-utility-error-700', dot: 'bg-utility-error-500' },
}

function formatKanbanDate(dateString: string): string {
  const d = new Date(dateString)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

interface KanbanCardProps {
  request: CultureRequest
  onClick: () => void
}

function KanbanCard({ request, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: request.id })
  const typeStyle = TYPE_STYLES[request.type] ?? 'text-utility-gray-600'
  const priorityStyle = PRIORITY_STYLES[request.priority] ?? PRIORITY_STYLES.low

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
      className={`rounded-lg border border-border-primary bg-background-primary p-3 cursor-pointer select-none transition-colors hover:border-border-brand ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="mb-1 line-clamp-1 text-sm font-semibold text-text-primary">{request.title}</p>
      <p className="mb-3 line-clamp-2 text-xs text-text-tertiary">{request.what}</p>
      <div className="flex items-center gap-3 text-xs">
        <span className={`inline-flex items-center gap-1 ${typeStyle}`}>
          <Tag className="h-3 w-3" />
          {formatLabel(request.type)}
        </span>
        <span className={`inline-flex items-center gap-1 ${priorityStyle.text}`}>
          <span className={`h-2 w-2 rounded-full ${priorityStyle.dot}`} />
          {formatLabel(request.priority)}
        </span>
        {request.due_date && (
          <span className="ml-auto inline-flex items-center gap-1 text-text-tertiary">
            <CalendarDays className="h-3 w-3" />
            {formatKanbanDate(request.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: { id: KanbanStatus; label: string; dot: string }
  requests: CultureRequest[]
  onCardClick: (r: CultureRequest) => void
}

function KanbanColumn({ column, requests, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
        <span className="text-sm font-semibold text-text-primary">{column.label}</span>
        <span className="text-sm text-text-quaternary">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl border p-2 transition-colors ${
          isOver
            ? 'border-border-brand bg-background-brand_primary'
            : 'border-border-secondary bg-background-secondary'
        }`}
      >
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-quaternary">
            <PackageOpen className="mb-2 h-8 w-8" />
            <p className="text-sm font-medium text-text-tertiary">No requests</p>
            <p className="text-xs">No requests in {column.label.toLowerCase()} status</p>
          </div>
        ) : (
          requests.map((req) => {
            function handleClick() {
              onCardClick(req)
            }
            return <KanbanCard key={req.id} request={req} onClick={handleClick} />
          })
        )}
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
    if (!req) return
    const targetStatus = KANBAN_TO_STATUS[over.id as KanbanStatus]
    if (!targetStatus || req.status === targetStatus) return
    updateStatus({ id: req.id, status: targetStatus })
  }

  function handleClosePanel() {
    setSelected(null)
  }

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              requests={requests.filter((r) => STATUS_TO_KANBAN[r.status] === col.id)}
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
