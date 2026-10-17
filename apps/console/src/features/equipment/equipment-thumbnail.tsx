import type { Equipment } from "@moc/types/equipment";
import { Package } from "lucide-react";

export function EquipmentThumbnail({ equipment, size }: { equipment: Equipment; size?: 'sm' | 'md' | 'lg' }) {
  const thumbnailSize = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8';
  const dimension = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  // The lg size is only used as the header tile in the equipment drawer/detail
  // page, which calls for a border per docs/design-system.md's panel spec.
  const border = size === 'lg' ? 'border border-secondary' : '';

  if (equipment.thumbnail) {
    return <img src={equipment.thumbnail} alt={equipment.name} width={dimension} height={dimension} className={`${thumbnailSize} rounded-lg object-cover ${border}`} />;
  }
  return (
    <span className={`flex ${thumbnailSize} grow-0 shrink-0 items-center justify-center rounded-lg bg-secondary text-quaternary ${border}`}>
      <Package className="size-4" />
    </span>
  );
}
