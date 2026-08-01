import { useCallback, useState } from "react";
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import type { Checklist, ChecklistItem, ChecklistSection } from "@moc/types/checklists";
import { randomId } from "@moc/utils/random-id";
import { findItem, findItemContainer, insertItemAt, removeItemFrom, reorder } from "./checklist-helpers";
import type { ChecklistAddRequest } from "./checklist-types";

export function useChecklistContent(checklist: Checklist, onUpdate: (checklist: Checklist) => void, addRequest: ChecklistAddRequest, onAddRequestDismiss?: () => void) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localAdd, setLocalAdd] = useState<ChecklistAddRequest>(null);
  const currentAdd = addRequest ?? localAdd;

  const dismissAdd = useCallback(() => {
    setLocalAdd(null);
    onAddRequestDismiss?.();
  }, [onAddRequestDismiss]);

  function toggle(itemId: string) {
    if (checklist.items.some((item) => item.id === itemId)) {
      onUpdate({ ...checklist, items: checklist.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) });
      return;
    }
    onUpdate({ ...checklist, sections: checklist.sections.map((section) => ({ ...section, items: section.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) })) });
  }

  function addTopItem(label: string) {
    const item: ChecklistItem = { id: randomId(), label, checked: false };
    onUpdate({ ...checklist, items: [...checklist.items, item] });
  }

  function addSectionItem(sectionId: string, label: string) {
    const item: ChecklistItem = { id: randomId(), label, checked: false };
    onUpdate({ ...checklist, sections: checklist.sections.map((section) => section.id === sectionId ? { ...section, items: [...section.items, item] } : section) });
  }

  function addSection(name: string) {
    const section: ChecklistSection = { id: randomId(), name, items: [] };
    onUpdate({ ...checklist, sections: [...checklist.sections, section] });
  }

  function renameItem(itemId: string, label: string) {
    if (checklist.items.some((item) => item.id === itemId)) {
      onUpdate({ ...checklist, items: checklist.items.map((item) => item.id === itemId ? { ...item, label } : item) });
      return;
    }
    onUpdate({ ...checklist, sections: checklist.sections.map((section) => ({ ...section, items: section.items.map((item) => item.id === itemId ? { ...item, label } : item) })) });
  }

  function deleteItem(itemId: string) { onUpdate(removeItemFrom(checklist, itemId)); }
  function renameSection(sectionId: string, name: string) { onUpdate({ ...checklist, sections: checklist.sections.map((section) => section.id === sectionId ? { ...section, name } : section) }); }
  function deleteSection(sectionId: string) {
    const section = checklist.sections.find((entry) => entry.id === sectionId);
    if (section) onUpdate({ ...checklist, items: [...checklist.items, ...section.items], sections: checklist.sections.filter((entry) => entry.id !== sectionId) });
  }
  function requestAddInSection(sectionId: string) { setLocalAdd({ type: "item", target: sectionId }); }

  const startDrag = useCallback((event: DragStartEvent) => setActiveId(String(event.active.id)), []);
  const dragOver = useCallback((event: DragOverEvent) => setOverId(event.over ? String(event.over.id) : null), []);
  const cancelDrag = useCallback(() => { setActiveId(null); setOverId(null); }, []);

  const endDrag = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    const activeIdValue = String(active.id);
    const overIdValue = String(over.id);

    if (activeIdValue.startsWith("section:") && overIdValue.startsWith("section:")) {
      const fromIndex = checklist.sections.findIndex((section) => section.id === activeIdValue.replace("section:", ""));
      const toIndex = checklist.sections.findIndex((section) => section.id === overIdValue.replace("section:", ""));
      if (fromIndex !== -1 && toIndex !== -1) onUpdate({ ...checklist, sections: reorder(checklist.sections, fromIndex, toIndex) });
      return;
    }

    if (!activeIdValue.startsWith("item:")) return;
    const itemId = activeIdValue.replace("item:", "");
    const item = findItem(checklist, itemId);
    const sourceContainer = findItemContainer(checklist, itemId);
    if (!item || !sourceContainer) return;

    if (overIdValue.startsWith("item:")) {
      const targetItemId = overIdValue.replace("item:", "");
      const targetContainer = findItemContainer(checklist, targetItemId);
      if (!targetContainer) return;
      const targetItems = targetContainer === "top" ? checklist.items : checklist.sections.find((section) => section.id === targetContainer)!.items;
      const targetIndex = targetItems.findIndex((entry) => entry.id === targetItemId);
      if (sourceContainer === targetContainer) {
        const sourceIndex = targetItems.findIndex((entry) => entry.id === itemId);
        if (sourceContainer === "top") onUpdate({ ...checklist, items: reorder(checklist.items, sourceIndex, targetIndex) });
        else onUpdate({ ...checklist, sections: checklist.sections.map((section) => section.id === sourceContainer ? { ...section, items: reorder(section.items, sourceIndex, targetIndex) } : section) });
      } else {
        let updated = removeItemFrom(checklist, itemId);
        const updatedTargetItems = targetContainer === "top" ? updated.items : updated.sections.find((section) => section.id === targetContainer)!.items;
        const updatedTargetIndex = updatedTargetItems.findIndex((entry) => entry.id === targetItemId);
        updated = insertItemAt(updated, targetContainer, item, updatedTargetIndex >= 0 ? updatedTargetIndex : updatedTargetItems.length);
        onUpdate(updated);
      }
      return;
    }

    if (overIdValue.startsWith("container:")) {
      const targetContainer = overIdValue.replace("container:", "");
      if (sourceContainer === targetContainer) return;
      let updated = removeItemFrom(checklist, itemId);
      const targetItems = targetContainer === "top" ? updated.items : updated.sections.find((section) => section.id === targetContainer)?.items ?? [];
      updated = insertItemAt(updated, targetContainer, item, targetItems.length);
      onUpdate(updated);
    }
  }, [checklist, onUpdate]);

  const activeItem = activeId?.startsWith("item:") ? findItem(checklist, activeId.replace("item:", "")) : null;
  const activeSection = activeId?.startsWith("section:") ? checklist.sections.find((section) => section.id === activeId.replace("section:", "")) ?? null : null;
  const topActiveIndex = activeId?.startsWith("item:") ? checklist.items.findIndex((item) => `item:${item.id}` === activeId) : -1;

  return {
    state: { activeId, currentAdd, overId },
    actions: { addSection, addSectionItem, addTopItem, cancelDrag, deleteItem, deleteSection, dismissAdd, dragOver, endDrag, renameItem, renameSection, requestAddInSection, startDrag, toggle },
    meta: { activeItem, activeSection, hasSections: checklist.sections.length > 0, sensors, topActiveIndex },
  };
}
