import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { useEffect, useState } from "react";
import { useEquipment } from "./equipment-provider";

export function useEquipmentDetail(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace();
  const generation = getCurrentWorkspaceGeneration();
  const {
    state: { equipment, equipmentError, isLoadingEquipment },
    actions: { loadEquipment, retryEquipment },
  } = useEquipment();
  const currentKey = `${currentWorkspaceId ?? "none"}:${generation}:${id ?? "none"}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const equipmentItem = equipment.find((item) => item.id === id) ?? null;

  useEffect(() => {
    if (!id || !currentWorkspaceId) return;

    let cancelled = false;
    const requestedKey = `${currentWorkspaceId}:${generation}:${id}`;

    void loadEquipment().then(() => {
      if (!cancelled) setLoadedKey(requestedKey);
    });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, generation, id, loadEquipment]);

  const isCurrent = loadedKey === currentKey;

  return {
    state: {
      equipment: equipmentItem,
      error: isCurrent ? equipmentError : null,
      isLoading: Boolean(!equipmentItem && id && currentWorkspaceId && (isLoadingEquipment || !isCurrent)),
    },
    actions: { retry: retryEquipment },
  };
}
