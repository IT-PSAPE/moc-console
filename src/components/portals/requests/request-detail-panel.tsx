import { DetailPanel } from '@/components/ui/detail-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { CultureRequest } from '@/types'

interface RequestDetailPanelProps {
  selected: CultureRequest | null
  onClose: () => void
}

export function RequestDetailPanel({ selected, onClose }: RequestDetailPanelProps) {
  return (
    <DetailPanel.Root open={!!selected} onClose={onClose}>
      {selected && (
        <>
          <DetailPanel.Header actions={<Button variant="secondary" size="sm">Edit</Button>}>
            {selected.title}
          </DetailPanel.Header>
          <DetailPanel.Body>
            <DetailPanel.Section label="Status">
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.priority} />
              </div>
            </DetailPanel.Section>
            <DetailPanel.Section label="5W + 1H">
              <DetailPanel.Field label="Who">{selected.who}</DetailPanel.Field>
              <DetailPanel.Field label="What">{selected.what}</DetailPanel.Field>
              <DetailPanel.Field label="When">{selected.when}</DetailPanel.Field>
              <DetailPanel.Field label="Where">{selected.where}</DetailPanel.Field>
              <DetailPanel.Field label="Why">{selected.why}</DetailPanel.Field>
              <DetailPanel.Field label="How">{selected.how}</DetailPanel.Field>
            </DetailPanel.Section>
            <DetailPanel.Section label="Details">
              <DetailPanel.Field label="Type">{selected.type}</DetailPanel.Field>
              <DetailPanel.Field label="Email">{selected.requester_email}</DetailPanel.Field>
              {selected.due_date && (
                <DetailPanel.Field label="Due Date">{formatDate(selected.due_date)}</DetailPanel.Field>
              )}
              <DetailPanel.Field label="Created">{formatDate(selected.created_at)}</DetailPanel.Field>
              <DetailPanel.Field label="Updated">{formatDate(selected.updated_at)}</DetailPanel.Field>
            </DetailPanel.Section>
          </DetailPanel.Body>
          <DetailPanel.Footer>
            {selected.status === 'pending' && <Button variant="danger" size="sm">Reject</Button>}
            {(selected.status === 'pending' || selected.status === 'in_review') && (
              <Button variant="primary" size="sm">Approve</Button>
            )}
            {selected.status === 'approved' && <Button variant="primary" size="sm">Mark Complete</Button>}
          </DetailPanel.Footer>
        </>
      )}
    </DetailPanel.Root>
  )
}
