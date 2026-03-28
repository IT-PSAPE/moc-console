import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { RecordCard } from '@/components/ui/record-card'
import { SearchInput } from '@/components/ui/search-input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { useIssues, useUpdateIssueStatus } from '@/hooks/use-equipment'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDate } from '@/lib/utils'
import type { EquipmentIssue } from '@/types'

interface EquipmentMaintenanceProps {
  onReportIssue: () => void
}

const SEARCH_FIELDS: (keyof EquipmentIssue)[] = ['equipment_name', 'description', 'reported_by']

function IssuesList({ issues, onResolve }: { issues: EquipmentIssue[]; onResolve?: (id: string) => void }) {
  const { filtered, search, setSearch } = useListFilter({
    data: issues,
    searchFields: SEARCH_FIELDS,
  })

  function renderCard(issue: EquipmentIssue) {
    return (
      <RecordCard.Root>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{issue.equipment_name}</RecordCard.Title>
            <RecordCard.Subtitle>Reported by {issue.reported_by}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={issue.status} />
        </RecordCard.Header>
        <div className="mt-2 text-sm text-text-secondary">{issue.description}</div>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Logged">{formatDate(issue.created_at)}</RecordCard.Field>
          {issue.resolved_at && <RecordCard.Field label="Resolved">{formatDate(issue.resolved_at)}</RecordCard.Field>}
        </RecordCard.FieldGrid>
        {onResolve && issue.status === 'active' && (
          <div className="mt-4">
            <Button onClick={() => onResolve(issue.id)} size="sm" variant="secondary">Mark Resolved</Button>
          </div>
        )}
      </RecordCard.Root>
    )
  }

  function renderRow(issue: EquipmentIssue) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{issue.equipment_name}</DataTable.Cell>
        <DataTable.Cell className="max-w-xs truncate">{issue.description}</DataTable.Cell>
        <DataTable.Cell>{issue.reported_by}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={issue.status} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDate(issue.created_at)}</DataTable.Cell>
        <DataTable.Cell>
          {onResolve && issue.status === 'active' && (
            <Button onClick={() => onResolve(issue.id)} size="sm" variant="secondary">Resolve</Button>
          )}
        </DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="w-full sm:max-w-sm">
          <SearchInput onChange={setSearch} placeholder="Search issues..." value={search} />
        </div>
      </div>

      <DataTable.Root
        data={filtered}
        emptyMessage="No issues found."
        getRowKey={(issue) => issue.id}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="equipment_name" sortable>Equipment</DataTable.Column>
          <DataTable.Column field="description">Description</DataTable.Column>
          <DataTable.Column field="reported_by" sortable>Reported By</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="created_at" sortable>Date Logged</DataTable.Column>
          <DataTable.Column field="actions">Actions</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<EquipmentIssue> render={renderRow} />
      </DataTable.Root>
    </>
  )
}

export function EquipmentMaintenance({ onReportIssue }: EquipmentMaintenanceProps) {
  const { data: issues = [] } = useIssues()
  const { mutate: updateIssueStatus } = useUpdateIssueStatus()

  const activeIssues = useMemo(() => issues.filter((i) => i.status === 'active'), [issues])
  const resolvedIssues = useMemo(() => issues.filter((i) => i.status === 'resolved'), [issues])

  function handleResolve(id: string) {
    updateIssueStatus({ id, status: 'resolved' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">{activeIssues.length} active issue{activeIssues.length !== 1 ? 's' : ''}</p>
        <Button onClick={onReportIssue} size="sm" variant="primary">Report Issue</Button>
      </div>

      <Tabs.Root defaultTab="active">
        <Tabs.List>
          <Tabs.Trigger id="active">Active Issues ({activeIssues.length})</Tabs.Trigger>
          <Tabs.Trigger id="resolved">Resolved ({resolvedIssues.length})</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content id="active">
          <IssuesList issues={activeIssues} onResolve={handleResolve} />
        </Tabs.Content>
        <Tabs.Content id="resolved">
          <IssuesList issues={resolvedIssues} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
