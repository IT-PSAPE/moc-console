import { useState } from 'react'
import type { ViewMode } from './requests-list'
import { RequestsList } from './requests-list'

export function RequestsAllRequests() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  return <RequestsList viewMode={viewMode} onViewModeChange={setViewMode} />
}
