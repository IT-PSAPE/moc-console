import { useState } from "react";

export function useKanbanDrawerState() {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  return { state: { isDrawerOpen }, actions: { setDrawerOpen } };
}
