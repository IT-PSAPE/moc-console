import type { ComponentType, MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@moc/ui/components/controls/button";
import { Accordion } from "@moc/ui/components/display/accordion";
import { Paragraph } from "@moc/ui/components/display/text";
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text";
import type { ChecklistItem, ChecklistSection } from "@moc/types/checklists";
import { DraggableCheckRow } from "./draggable-check-row";
import { DraggableSectionHandle } from "./draggable-section-handle";
import { DropIndicatorLine } from "./drop-indicator-line";
import { DroppableZone } from "./droppable-zone";
import { InlineItemInput } from "./inline-item-input";
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";
import { useState } from "react";

type SectionRowProps = {
  section: ChecklistSection;
  onToggle: (id: string) => void;
  onAddItem: (sectionId: string, label: string) => void;
  onRenameItem: (id: string, label: string) => void;
  onDeleteItem: (id: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  activeItemId: string | null;
  overItemId: string | null;
  isAddingItem: boolean;
  onRequestAddItem: (sectionId: string) => void;
  onDismissAdd: () => void;
  itemSlot?: ComponentType<{ item: ChecklistItem }>;
};

export function SectionRow({ section, onToggle, onAddItem, onRenameItem, onDeleteItem, onRenameSection, onDeleteSection, activeItemId, overItemId, isAddingItem, onRequestAddItem, onDismissAdd, itemSlot }: SectionRowProps) {
  const { setNodeRef } = useDroppable({ id: `section:${section.id}` });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const checkedCount = section.items.filter((item) => item.checked).length;
  const activeIndex = activeItemId ? section.items.findIndex((item) => `item:${item.id}` === activeItemId) : -1;
  function renameSection(name: string) { onRenameSection(section.id, name); }
  function requestAdd(event: MouseEvent) { event.stopPropagation(); onRequestAddItem(section.id); }
  function openDeleteSection(event: MouseEvent) { event.stopPropagation(); setDeleteOpen(true); }
  function deleteSection() { onDeleteSection(section.id); }
  function addItem(label: string) { onAddItem(section.id, label); }

  return (
    <div ref={setNodeRef}>
      <Accordion.Item value={section.id} className="border-b border-secondary">
        <div className="group/section flex items-center">
          <div className="pl-3"><DraggableSectionHandle sectionId={section.id} /></div>
          <Accordion.Trigger className="flex items-center gap-3 px-2 py-2.5 pl-1.5 transition-colors hover:bg-background-primary-hover">
            <ChevronDown className="size-4 shrink-0 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
            <InlineEditableText value={section.name} onSave={renameSection} className="label-sm text-left" />
            <Paragraph.xs className="shrink-0 text-tertiary">{checkedCount}/{section.items.length}</Paragraph.xs>
          </Accordion.Trigger>
          <Button.Icon aria-label="Add item" variant="ghost" icon={<Plus />} className="mr-2 shrink-0 !p-1 text-tertiary hover:text-secondary" onClick={requestAdd} />
          <Button.Icon aria-label="Delete section" variant="ghost" icon={<Trash2 />} className="mr-2 shrink-0 !p-1 text-quaternary hover:text-secondary" onClick={openDeleteSection} />
        </div>

        <Accordion.Content>
          <DroppableZone id={`container:${section.id}`} className="flex min-h-[2rem] flex-col">
            {section.items.map((item, index) => {
              const itemDndId = `item:${item.id}`;
              const isOverTarget = overItemId === itemDndId && activeItemId && activeItemId !== itemDndId;
              const showAbove = isOverTarget && activeIndex > index;
              const showBelow = isOverTarget && (activeIndex < index || activeIndex === -1);
              return (
                <div key={item.id} className="relative">
                  {showAbove && <DropIndicatorLine />}
                  <DraggableCheckRow item={item} onToggle={onToggle} onRename={onRenameItem} onDelete={onDeleteItem} itemSlot={itemSlot} />
                  {showBelow && <DropIndicatorLine />}
                </div>
              );
            })}
            {isAddingItem && <InlineItemInput onSubmit={addItem} onDismiss={onDismissAdd} />}
          </DroppableZone>
        </Accordion.Content>
      </Accordion.Item>
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete section?"
        description={`Items in “${section.name}” will be kept and moved to the top of this checklist.`}
        confirmLabel="Delete section"
        onConfirm={deleteSection}
      />
    </div>
  );
}
