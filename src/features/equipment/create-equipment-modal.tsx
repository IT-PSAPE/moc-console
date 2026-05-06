import { Modal } from "@/components/overlays/modal"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { Label } from "@/components/display/text"
import { Dropdown } from "@/components/overlays/dropdown"
import { Check, ChevronDown } from "lucide-react"
import { useCallback, useState } from "react"
import type { EquipmentCategory } from "@/types/equipment"
import { equipmentCategoryLabel } from "@/types/equipment"

type CreateEquipmentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (equipment: { name: string; serialNumber: string; category: EquipmentCategory; location: string }) => void
}

const allCategories: EquipmentCategory[] = ["camera", "lens", "lighting", "audio", "support", "monitor", "cable", "accessory"]

const initialState = { name: "", serialNumber: "", category: "camera" as EquipmentCategory, location: "" }

export function CreateEquipmentModal({ open, onOpenChange, onCreate }: CreateEquipmentModalProps) {
  const [form, setForm] = useState(initialState)

  const resetForm = useCallback(() => setForm(initialState), [])

  const canSubmit = form.name.trim().length > 0 && form.serialNumber.trim().length > 0

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    onCreate({
      name: form.name.trim(),
      serialNumber: form.serialNumber.trim(),
      category: form.category,
      location: form.location.trim(),
    })
    resetForm()
  }, [canSubmit, form, onCreate, resetForm])

  return (
    <Modal open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) resetForm() }}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="w-full max-w-md">
            <Modal.Header>
              <Label.md>New Equipment</Label.md>
            </Modal.Header>
            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Name" required />
                  <Input
                    placeholder="Equipment name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Serial Number" required />
                  <Input
                    placeholder="Serial number"
                    value={form.serialNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Category" required />
                  <Dropdown placement="bottom">
                    <Dropdown.Trigger className="w-full flex items-center justify-between gap-1.5 py-2 px-3 rounded-lg border border-secondary bg-primary cursor-pointer paragraph-sm">
                      <span>{equipmentCategoryLabel[form.category]}</span>
                      <ChevronDown className="size-4 text-tertiary" />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                      {allCategories.map((c) => (
                        <Dropdown.Item key={c} onSelect={() => setForm((prev) => ({ ...prev, category: c }))}>
                          <span className="size-4 shrink-0 flex items-center justify-center">
                            {c === form.category && <Check className="size-3.5 text-brand_secondary" />}
                          </span>
                          {equipmentCategoryLabel[c]}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Panel>
                  </Dropdown>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Location" optional />
                  <Input
                    placeholder="Storage location"
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
            </Modal.Content>
            <Modal.Footer>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
              <Button onClick={handleSubmit} disabled={!canSubmit}>Create</Button>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
