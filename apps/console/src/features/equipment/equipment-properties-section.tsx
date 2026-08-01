import { Select } from "@moc/ui/components/form/select";
import { Paragraph } from "@moc/ui/components/display/text";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Input } from "@moc/ui/components/form/input";
import {
  equipmentStatusLabel,
  equipmentCategoryLabel,
} from "@moc/types/equipment";
import type {
  Equipment,
  EquipmentStatus,
  EquipmentCategory,
} from "@moc/types/equipment";
import { Hash, Loader, MapPin, Tag, User } from "lucide-react";
import type { ChangeEvent } from "react";

const allStatuses: EquipmentStatus[] = [
  "available",
  "booked",
  "booked_out",
  "maintenance",
];
const allCategories: EquipmentCategory[] = [
  "camera",
  "lens",
  "lighting",
  "audio",
  "support",
  "monitor",
  "cable",
  "accessory",
];
const statusItems = allStatuses.map((status) => ({ label: equipmentStatusLabel[status], value: status }));
const categoryItems = allCategories.map((category) => ({ label: equipmentCategoryLabel[category], value: category }));

type EquipmentPropertiesSectionProps = {
  draft: Equipment;
  onUpdateField: <K extends keyof Equipment>(
    field: K,
    value: Equipment[K],
  ) => void;
};

export function EquipmentPropertiesSection({
  draft,
  onUpdateField,
}: EquipmentPropertiesSectionProps) {
  function handleLocationChange(event: ChangeEvent<HTMLInputElement>) {
    onUpdateField("location", event.target.value);
  }

  function handleCategoryChange(value: EquipmentCategory | null) {
    if (value) onUpdateField("category", value);
  }

  function handleStatusChange(value: EquipmentStatus | null) {
    if (value) onUpdateField("status", value);
  }

  function renderCategory(category: EquipmentCategory) {
    return <Select.Item key={category} value={category}>{equipmentCategoryLabel[category]}</Select.Item>;
  }

  function renderStatus(status: EquipmentStatus) {
    return <Select.Item key={status} value={status}>{equipmentStatusLabel[status]}</Select.Item>;
  }

  return (
    <div className="px-4 space-y-3">
      <MetaRow icon={<Hash />} label="Serial Number">
        <Paragraph.sm>{draft.serialNumber}</Paragraph.sm>
      </MetaRow>

      <MetaRow icon={<Tag />} label="Category">
        <Select.Root name="equipment-category" items={categoryItems} value={draft.category} onValueChange={handleCategoryChange}>
          <Select.Trigger aria-label="Equipment category" className="w-44" style="ghost" />
          <Select.Content>{allCategories.map(renderCategory)}</Select.Content>
        </Select.Root>
      </MetaRow>

      <MetaRow icon={<Loader />} label="Status">
        <Select.Root name="equipment-status" items={statusItems} value={draft.status} onValueChange={handleStatusChange}>
          <Select.Trigger aria-label="Equipment status" className="w-44" style="ghost" />
          <Select.Content>{allStatuses.map(renderStatus)}</Select.Content>
        </Select.Root>
      </MetaRow>

      <MetaRow icon={<MapPin />} label="Location">
        <Input
          aria-label="Equipment location"
          name="equipment-location"
          autoComplete="off"
          type="text"
          value={draft.location}
          onChange={handleLocationChange}
          placeholder="Enter location"
          style={"ghost"}
        />
      </MetaRow>

      <MetaRow icon={<User />} label="Booked By">
        <Paragraph.sm>{draft.bookedBy ?? "—"}</Paragraph.sm>
      </MetaRow>
    </div>
  );
}
