import { DetailPanel } from '@/components/ui/detail-panel'
import { Maximize2, Pencil, EyeOff, Trash2 } from 'lucide-react'
import { RequestAssigneesManager } from './request-assignees-manager'
import { RequestCommentsSection } from './request-comments-section'
import { RequestFiveWhSection } from './request-five-wh-section'
import { RequestOverviewSection } from './request-overview-section'
import { RequestRelatedResourcesSection } from './request-related-resources-section'
import { useAddRequestComment, useAssignRequestAssignee, useUnassignRequestAssignee, useUpdateRequest, useUpdateRequestStatus } from '@/hooks/use-requests'
import { useRequestSupportData } from '@/hooks/use-request-support-data'
import type { CultureRequest } from '@/types'

interface RequestDetailPanelProps {
  selected: CultureRequest | null
  onClose: () => void
}

const HEADER_ACTIONS = [
  { icon: Maximize2, label: 'Expand' },
  { icon: Pencil, label: 'Edit' },
  { icon: EyeOff, label: 'Hide' },
  { icon: Trash2, label: 'Delete' },
]

export function RequestDetailPanel({ selected, onClose }: RequestDetailPanelProps) {
  const { mutate: updateRequest } = useUpdateRequest()
  const { mutate: updateStatus } = useUpdateRequestStatus()
  const { mutate: addComment } = useAddRequestComment()
  const { mutate: assignAssignee } = useAssignRequestAssignee()
  const { mutate: unassignAssignee } = useUnassignRequestAssignee()
  const { data: supportData } = useRequestSupportData()

  function handleStatusChange(status: CultureRequest['status']) {
    if (!selected) return
    updateStatus({ id: selected.id, status })
  }

  function handlePriorityChange(priority: CultureRequest['priority']) {
    if (!selected) return
    updateRequest({ id: selected.id, changes: { priority } })
  }

  function handleTypeChange(type: CultureRequest['type']) {
    if (!selected) return
    updateRequest({ id: selected.id, changes: { type } })
  }

  function handleDueDateChange(due_date: string) {
    if (!selected) return
    updateRequest({ id: selected.id, changes: { due_date: due_date || undefined } })
  }

  function handleAddComment(body: string) {
    if (!selected) return
    addComment({ id: selected.id, author: 'MoC Console Admin', body })
  }

  function handleAssign(memberId: string) {
    if (!selected) return
    assignAssignee({ id: selected.id, memberId })
  }

  function handleUnassign(memberId: string) {
    if (!selected) return
    unassignAssignee({ id: selected.id, memberId })
  }

  return (
    <DetailPanel.Root open={!!selected} onClose={onClose}>
      {selected && (
        <>
          <DetailPanel.Header
            actions={
              <div className="flex items-center gap-1">
                {HEADER_ACTIONS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="rounded-lg p-1.5 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            }
          />
          <DetailPanel.Body>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>

              <RequestOverviewSection
                request={selected}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onTypeChange={handleTypeChange}
                onDueDateChange={handleDueDateChange}
              />

              <RequestAssigneesManager
                assignees={selected.assignees ?? []}
                members={supportData?.members ?? []}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />

              <div className="border-t border-border-secondary" />

              <RequestFiveWhSection request={selected} />

              <div className="border-t border-border-secondary" />

              <RequestRelatedResourcesSection request={selected} />

              <RequestCommentsSection notes={selected.notes ?? []} onAddComment={handleAddComment} />
            </div>
          </DetailPanel.Body>
        </>
      )}
    </DetailPanel.Root>
  )
}
