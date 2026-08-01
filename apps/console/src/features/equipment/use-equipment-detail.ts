import { useEffect, useState } from "react"
import { useEquipment } from "./equipment-provider"

export function useEquipmentDetail(id: string | undefined) {
  const {
    state: { equipment, isLoadingEquipment },
    actions: { loadEquipment },
  } = useEquipment()
  const [loadedId, setLoadedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadEquipment().finally(() => {
      if (!cancelled) setLoadedId(id ?? null)
    })
    return () => { cancelled = true }
  }, [id, loadEquipment])

  return {
    state: {
      equipment: equipment.find((item) => item.id === id) ?? null,
      isLoading: isLoadingEquipment || loadedId !== (id ?? null),
    },
  }
}
