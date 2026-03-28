import { useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useEquipment, useCreateIssue } from '@/hooks/use-equipment'
import type { Equipment } from '@/types'

interface EquipmentIssueFormProps {
  equipment: Equipment | null
  onClose: () => void
  open: boolean
}

export function EquipmentIssueForm({ equipment, onClose, open }: EquipmentIssueFormProps) {
  const { data: allEquipment = [] } = useEquipment()
  const { mutateAsync: createIssue } = useCreateIssue()

  const [equipmentId, setEquipmentId] = useState(equipment?.id ?? '')
  const [description, setDescription] = useState('')
  const [reportedBy, setReportedBy] = useState('')

  function handleEquipmentChange(e: ChangeEvent<HTMLSelectElement>) {
    setEquipmentId(e.target.value)
  }

  async function handleSubmit() {
    const targetId = equipment?.id ?? equipmentId
    if (!targetId || !description.trim() || !reportedBy.trim()) {
      return
    }

    await createIssue({
      equipment_id: targetId,
      description: description.trim(),
      reported_by: reportedBy.trim(),
    })

    onClose()
  }

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>Report Issue</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {equipment ? (
            <div className="rounded-xl border border-border-secondary bg-background-secondary px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">{equipment.name}</p>
              <p className="mt-1 text-sm text-text-tertiary">{equipment.serial_number}</p>
            </div>
          ) : (
            <Select id="issue-equipment" label="Equipment" onChange={handleEquipmentChange} value={equipmentId}>
              <option value="">Select equipment...</option>
              {allEquipment.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          )}

          <TextArea
            id="issue-description"
            label="Description"
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            value={description}
          />

          <Input
            id="issue-reported-by"
            label="Reported By"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setReportedBy(e.target.value)}
            placeholder="Your name"
            value={reportedBy}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} size="sm" variant="secondary">Cancel</Button>
        <Button onClick={handleSubmit} size="sm" variant="primary">Submit Report</Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
