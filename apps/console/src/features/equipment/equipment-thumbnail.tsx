import type { Equipment } from "@moc/types/equipment";
import { Package } from "lucide-react";

export function EquipmentThumbnail({ equipment, size }: { equipment: Equipment; size?: 'sm' | 'md' | 'lg' }) {
  const thumbnailSize = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-10' : 'size-8';
  const dimension = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;

  if (equipment.thumbnail) {
    return <img src={equipment.thumbnail} alt={equipment.name} width={dimension} height={dimension} className={`${thumbnailSize} rounded object-cover`} />;
  }
  return (
    <span className={`flex ${thumbnailSize} grow-0 shrink-0 items-center justify-center rounded bg-secondary text-quaternary`}>
      <Package className="size-4" />
    </span>
  );
}
