import { DetailPanel } from '@/components/ui/detail-panel'
import { RequestAssigneesManager } from './request-assignees-manager'
import { RequestCommentsSection } from './request-comments-section'
import { RequestFiveWhSection } from './request-five-wh-section'
import { RequestOverviewSection } from './request-overview-section'
import { RequestRelatedResourcesSection } from './request-related-resources-section'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAddRequestComment, useAssignRequestAssignee, useUnassignRequestAssignee } from '@/hooks/use-requests'
import { formatDateTime } from '@/lib/utils'
import { useRequestSupportData } from '@/hooks/use-request-support-data'
import type { CultureRequest } from '@/types'

interface RequestDetailPanelProps {
  selected: CultureRequest | null
  onClose: () => void
}

export function RequestDetailPanel({ selected, onClose }: RequestDetailPanelProps) {
  const { mutate: addComment } = useAddRequestComment()
  const { mutate: assignAssignee } = useAssignRequestAssignee()
  const { mutate: unassignAssignee } = useUnassignRequestAssignee()
  const { data: supportData } = useRequestSupportData()

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
          <DetailPanel.Header>{selected.title}</DetailPanel.Header>
          <DetailPanel.Body>
            <div className="space-y-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-secondary bg-background-secondary px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-quaternary">Status</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <StatusBadge status={selected.priority} />
                    <StatusBadge status={selected.type} />
                  </div>
                </div>
                <div className="rounded-xl border border-border-secondary bg-background-secondary px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-quaternary">Request Timeline</p>
                  <dl className="mt-2 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-text-quaternary">Due</dt>
                      <dd>{selected.due_date ? formatDateTime(selected.due_date) : 'Not set'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-text-quaternary">Created</dt>
                      <dd>{formatDateTime(selected.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-text-quaternary">Requester</dt>
                      <dd>{selected.who}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <RequestAssigneesManager
                assignees={selected.assignees ?? []}
                members={supportData?.members ?? []}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />

              <DetailPanel.Section label="Request Overview">
                <RequestOverviewSection request={selected} />
              </DetailPanel.Section>
              <DetailPanel.Section label="Brief and Intent">
                <RequestFiveWhSection request={selected} />
              </DetailPanel.Section>
              <DetailPanel.Section label="Related Resources">
                <RequestRelatedResourcesSection request={selected} />
              </DetailPanel.Section>
              <RequestCommentsSection notes={selected.notes ?? []} onAddComment={handleAddComment} />
            </div>
          </DetailPanel.Body>
        </>
      )}
    </DetailPanel.Root>
  )
}
