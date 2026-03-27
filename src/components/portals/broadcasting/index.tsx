import { Routes, Route, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs } from '@/components/ui/tabs'
import { BroadcastingDashboard } from './broadcasting-dashboard'
import { BroadcastList } from './broadcast-list'
import { MediaLibrary } from './media-library'
import { MediaQueue } from './media-queue'

export function BroadcastingPortal() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasting"
        description="Manage broadcasts, schedules, live streams, and media queue"
      />
      <Routes>
        <Route index element={
          <Tabs.Root defaultTab="overview">
            <Tabs.List>
              <Tabs.Trigger id="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger id="live">Live</Tabs.Trigger>
              <Tabs.Trigger id="scheduled">Scheduled</Tabs.Trigger>
              <Tabs.Trigger id="history">History</Tabs.Trigger>
              <Tabs.Trigger id="library">Media Library</Tabs.Trigger>
              <Tabs.Trigger id="queue">Queue</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content id="overview">
              <BroadcastingDashboard />
              <div className="mt-6">
                <BroadcastList />
              </div>
            </Tabs.Content>
            <Tabs.Content id="live">
              <BroadcastList statusFilter="live" />
            </Tabs.Content>
            <Tabs.Content id="scheduled">
              <BroadcastList statusFilter="scheduled" />
            </Tabs.Content>
            <Tabs.Content id="history">
              <BroadcastList statusFilter="completed" />
            </Tabs.Content>
            <Tabs.Content id="library">
              <MediaLibrary />
            </Tabs.Content>
            <Tabs.Content id="queue">
              <MediaQueue />
            </Tabs.Content>
          </Tabs.Root>
        } />
        <Route path="live" element={<BroadcastList statusFilter="live" />} />
        <Route path="scheduled" element={<BroadcastList statusFilter="scheduled" />} />
        <Route path="history" element={<BroadcastList statusFilter="completed" />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}
