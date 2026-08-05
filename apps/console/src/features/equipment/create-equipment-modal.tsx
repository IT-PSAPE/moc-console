import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Select } from "@moc/ui/components/form/select"
import { Label } from "@moc/ui/components/display/text"
import type { EquipmentCategory } from "@moc/types/equipment"
import { equipmentCategoryLabel } from "@moc/types/equipment"
import { useCreateEquipmentForm } from "./use-create-equipment-form"

type CreateEquipmentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (equipment: { name: string; serialNumber: string; category: EquipmentCategory; location: string }) => void
}

const allCategories: EquipmentCategory[] = ["camera", "lens", "lighting", "audio", "support", "monitor", "cable", "accessory"]
const categoryItems = allCategories.map((category) => ({ label: equipmentCategoryLabel[category], value: category }))

export function CreateEquipmentModal({ open, onOpenChange, onCreate }: CreateEquipmentModalProps) {
  const { state, actions } = useCreateEquipmentForm(onCreate, onOpenChange)
  const { form } = state

  return (
    <Modal open={open} onOpenChange={actions.changeOpen}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:max-w-md">
            <Modal.Header>
              <Label.md>New equipment</Label.md>
            </Modal.Header>
            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Name" required />
                  <Input
                    aria-label="Equipment name"
                    name="equipment-name"
                    autoComplete="off"
                    placeholder="Equipment name"
                    value={form.name}
                    onChange={actions.changeName}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Serial number" required />
                  <Input
                    aria-label="Serial number"
                    name="serial-number"
                    autoComplete="off"
                    placeholder="Serial number"
                    value={form.serialNumber}
                    onChange={actions.changeSerialNumber}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Category" required />
                  <Select.Root name="equipment-category" items={categoryItems} value={form.category} onValueChange={actions.changeCategory}>
                    <Select.Trigger aria-label="Equipment category" />
                    <Select.Content>{allCategories.map((category) => <Select.Item key={category} value={category}>{equipmentCategoryLabel[category]}</Select.Item>)}</Select.Content>
                  </Select.Root>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Location" optional />
                  <Input
                    aria-label="Equipment location"
                    name="equipment-location"
                    autoComplete="off"
                    placeholder="Storage location"
                    value={form.location}
                    onChange={actions.changeLocation}
                  />
                </div>
              </div>
            </Modal.Content>
            <Modal.Footer>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
              <Button onClick={actions.submit} disabled={!state.canSubmit}>Create</Button>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
