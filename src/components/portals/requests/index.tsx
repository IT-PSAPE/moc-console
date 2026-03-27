import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { RequestsDashboard } from './requests-dashboard'
import { RequestsList } from './requests-list'
import { RequestForm } from './request-form'
import type { ViewMode } from './requests-list'

export function RequestsPortal() {
  const [formOpen, setFormOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  function handleOpenForm() {
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Manage incoming requests from public platforms"
        actions={<Button variant="primary" size="sm" onClick={handleOpenForm}>New Request</Button>}
      />

      <RequestsDashboard />

      <RequestsList viewMode={viewMode} onViewModeChange={setViewMode} />

      <RequestForm open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}
