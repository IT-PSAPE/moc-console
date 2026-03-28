import { Routes, Route, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { BroadcastingOverview } from './broadcasting-overview'
import { MediaBinPage } from './media-bin-page'
import { BroadcastsPage } from './broadcasts-page'

export function BroadcastingPortal() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasting"
        description="Media orchestration — store, compose, sequence, and play content during live events"
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            New Broadcast
          </Button>
        }
      />
      <Routes>
        <Route index element={<BroadcastingOverview />} />
        <Route path="media-bin" element={<MediaBinPage />} />
        <Route path="broadcasts" element={<BroadcastsPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}
