import { useMemo, useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { RequestAssignee, RequestMember } from '@/types'

interface RequestAssigneesManagerProps {
  assignees: RequestAssignee[]
  members: RequestMember[]
  onAssign: (memberId: string) => void
  onUnassign: (memberId: string) => void
}

export function RequestAssigneesManager({ assignees, members, onAssign, onUnassign }: RequestAssigneesManagerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')

  const availableMembers = useMemo(() => {
    const assignedIds = new Set(assignees.map((a) => a.member_id))
    return members.filter((m) => !assignedIds.has(m.id))
  }, [assignees, members])

  function handleTogglePicker() {
    setShowPicker((prev) => !prev)
  }

  function handleMemberChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedMemberId(event.target.value)
  }

  function handleAssignClick() {
    if (!selectedMemberId) return
    onAssign(selectedMemberId)
    setSelectedMemberId('')
    setShowPicker(false)
  }

  return (
    <section>
      <div className="flex items-center gap-3 py-1.5">
        <span className="text-text-quaternary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="w-28 shrink-0 text-sm text-text-secondary">Assigned Members</span>
        <button
          onClick={handleTogglePicker}
          className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Member
        </button>
      </div>

      {assignees.length > 0 && (
        <div className="ml-7 mt-1 space-y-1">
          {assignees.map((assignee) => {
            function handleRemove() {
              onUnassign(assignee.member_id)
            }
            return (
              <div key={assignee.id} className="flex items-center justify-between rounded-lg border border-border-secondary px-3 py-1.5">
                <span className="text-sm text-text-primary">{assignee.member_name}</span>
                <button onClick={handleRemove} className="text-xs text-text-tertiary hover:text-text-secondary">
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showPicker && (
        <div className="ml-7 mt-2 flex items-center gap-2">
          <Select value={selectedMemberId} onChange={handleMemberChange} className="flex-1">
            <option value="">Select a member</option>
            {availableMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" onClick={handleAssignClick} disabled={!selectedMemberId}>
            Add
          </Button>
        </div>
      )}
    </section>
  )
}
