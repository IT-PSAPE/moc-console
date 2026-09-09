import { updateEquipment } from "@/data/mutate-equipment";
import { useEditableStore } from "@/hooks/use-editable-store";
import type { Equipment } from "@moc/types/equipment";

type UseEquipmentStoreOptions = {
  syncEquipment?: (equipment: Equipment) => void;
};

export function useEquipmentStore(initialEquipment: Equipment, options?: UseEquipmentStoreOptions) {
  return useEditableStore(initialEquipment, {
    persist: updateEquipment,
    errorMessage: "Equipment could not be saved. Please review the fields and try again.",
    sync: options?.syncEquipment,
  });
}
