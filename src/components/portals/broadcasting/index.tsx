import { Routes, Route, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { BroadcastWorkspace } from './broadcast-workspace'
import { BroadcastingDashboard } from './broadcasting-dashboard'
import { BroadcastList } from './broadcast-list'

export function BroadcastingPortal() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasting"
        description="Manage broadcasts, media assets, and playback queues"
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            New Broadcast
          </Button>
        }
      />
      <Routes>
        <Route index element={
          <>
            <BroadcastingDashboard />
            <div className="mt-6">
              <BroadcastWorkspace.Root>
                <BroadcastWorkspace.MediaBin />
                <BroadcastWorkspace.Workspace />
                <BroadcastWorkspace.Queue />
              </BroadcastWorkspace.Root>
            </div>
          </>
        } />
        <Route path="broadcasts" element={<BroadcastList />} />
        <Route path="history" element={<BroadcastList statusFilter="completed" />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}
