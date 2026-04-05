import type { Equipment } from "@/types/equipment";
import { Package } from "lucide-react";

export function EquipmentThumbnail({ equipment }: { equipment: Equipment }) {
  if (equipment.thumbnail) {
    return <img src={equipment.thumbnail} alt={equipment.name} className="size-8 rounded object-cover" />;
  }
  return (
    <span className="flex size-8 items-center justify-center rounded bg-secondary text-quaternary">
      <Package className="size-4" />
    </span>
  );
}