import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Badge } from "@moc/ui/components/display/badge";
import { Paragraph } from "@moc/ui/components/display/text";
import { MetaRow } from "@/features/requests/request-properties";
import { Input } from "@moc/ui/components/form/input";
import {
  equipmentStatusLabel,
  equipmentStatusColor,
  equipmentCategoryLabel,
  equipmentCategoryColor,
} from "@moc/types/equipment";
import type {
  Equipment,
  EquipmentStatus,
  EquipmentCategory,
} from "@moc/types/equipment";
import { Check, Hash, Loader, MapPin, Tag, User } from "lucide-react";
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

  return (
    <div className="px-4 space-y-3">
      <MetaRow icon={<Hash />} label="Serial Number">
        <Paragraph.sm>{draft.serialNumber}</Paragraph.sm>
      </MetaRow>

      <MetaRow icon={<Tag />} label="Category">
        <Dropdown placement="bottom">
          <Dropdown.Trigger>
            <Badge
              label={equipmentCategoryLabel[draft.category]}
              color={equipmentCategoryColor[draft.category]}
              className="cursor-pointer"
            />
          </Dropdown.Trigger>
          <Dropdown.Panel>
            {allCategories.map((category) => (
              <CategoryOption
                key={category}
                category={category}
                selected={category === draft.category}
                onSelect={onUpdateField}
              />
            ))}
          </Dropdown.Panel>
        </Dropdown>
      </MetaRow>

      <MetaRow icon={<Loader />} label="Status">
        <Dropdown placement="bottom">
          <Dropdown.Trigger>
            <Badge
              label={equipmentStatusLabel[draft.status]}
              color={equipmentStatusColor[draft.status]}
              className="cursor-pointer"
            />
          </Dropdown.Trigger>
          <Dropdown.Panel>
            {allStatuses.map((status) => (
              <StatusOption
                key={status}
                status={status}
                selected={status === draft.status}
                onSelect={onUpdateField}
              />
            ))}
          </Dropdown.Panel>
        </Dropdown>
      </MetaRow>

      <MetaRow icon={<MapPin />} label="Location">
        <Input
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

type CategoryOptionProps = {
  category: EquipmentCategory;
  selected: boolean;
  onSelect: (field: "category", value: EquipmentCategory) => void;
};

function CategoryOption({ category, selected, onSelect }: CategoryOptionProps) {
  function handleSelect() {
    onSelect("category", category);
  }

  return (
    <Dropdown.Item onSelect={handleSelect}>
      <span className="size-4 shrink-0 flex items-center justify-center">
        {selected && <Check className="size-3.5 text-brand_secondary" />}
      </span>
      {equipmentCategoryLabel[category]}
    </Dropdown.Item>
  );
}

type StatusOptionProps = {
  status: EquipmentStatus;
  selected: boolean;
  onSelect: (field: "status", value: EquipmentStatus) => void;
};

function StatusOption({ status, selected, onSelect }: StatusOptionProps) {
  function handleSelect() {
    onSelect("status", status);
  }

  return (
    <Dropdown.Item onSelect={handleSelect}>
      <span className="size-4 shrink-0 flex items-center justify-center">
        {selected && <Check className="size-3.5 text-brand_secondary" />}
      </span>
      {equipmentStatusLabel[status]}
    </Dropdown.Item>
  );
}
