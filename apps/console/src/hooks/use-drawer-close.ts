import { useCallback } from "react";
import { useDrawer } from "@moc/ui/components/overlays/drawer";

export function useDrawerClose(onClose?: () => void) {
  const { actions } = useDrawer();
  return useCallback(() => {
    if (onClose) onClose();
    else actions.close();
  }, [actions, onClose]);
}
