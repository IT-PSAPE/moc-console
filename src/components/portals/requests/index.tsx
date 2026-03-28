import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { RequestForm } from './request-form'
import { RequestsOverview } from './requests-overview'
import { RequestsAllRequests } from './requests-all-requests'
import { RequestsArchive } from './requests-archive'
import { RequestsInsights } from './requests-insights'

export function RequestsPortal() {
  const [formOpen, setFormOpen] = useState(false)

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

      <Routes>
        <Route index element={<RequestsOverview />} />
        <Route path="all" element={<RequestsAllRequests />} />
        <Route path="archive" element={<RequestsArchive />} />
        <Route path="insights" element={<RequestsInsights />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>

      <RequestForm open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}
