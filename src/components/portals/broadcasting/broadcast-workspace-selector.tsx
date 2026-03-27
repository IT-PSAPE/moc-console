import type { ChangeEvent } from 'react'
import { Select } from '@/components/ui/select'
import { useBroadcastWorkspaceContext } from './broadcast-workspace-context'

interface BroadcastWorkspaceSelectorProps {
  className?: string
  label?: string
}

export function BroadcastWorkspaceSelector({ className, label = 'Broadcast' }: BroadcastWorkspaceSelectorProps) {
  const { state: { broadcasts, selectedBroadcastId }, actions: { selectBroadcast } } = useBroadcastWorkspaceContext()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    selectBroadcast(event.target.value)
  }

  return (
    <Select className={className} label={label} onChange={handleChange} value={selectedBroadcastId}>
      {broadcasts.map((broadcast) => (
        <option key={broadcast.id} value={broadcast.id}>{broadcast.title}</option>
      ))}
    </Select>
  )
}
