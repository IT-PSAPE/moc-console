import { Label } from "@moc/ui/components/display/text";
import { TextArea } from "@moc/ui/components/form/text-area";
import type { Equipment } from "@moc/types/equipment";
import { StickyNote } from "lucide-react";
import type { ChangeEvent } from "react";

type EquipmentNotesSectionProps = {
  draft: Equipment;
  onUpdateField: (field: "notes", value: string) => void;
};

export function EquipmentNotesSection({
  draft,
  onUpdateField,
}: EquipmentNotesSectionProps) {
  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onUpdateField("notes", event.target.value);
  }

  const placeholder =
    draft.status === "maintenance"
      ? "Describe the issue or maintenance required…"
      : "Add notes about this equipment…";

  return (
    <div>
      <div className="flex items-center gap-2 pb-3">
        <StickyNote className="size-4 text-tertiary" />
        <Label.sm className="text-primary">Notes</Label.sm>
      </div>
      <TextArea
        aria-label="Equipment notes"
        name="equipment-notes"
        rows={4}
        value={draft.notes}
        onChange={handleNotesChange}
        placeholder={placeholder}
        style="ghost"
      />
    </div>
  );
}
