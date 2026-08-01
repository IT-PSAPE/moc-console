import { GripVertical } from "lucide-react";
import { Input } from "@moc/ui/components/form/input";
import { useInlineChecklistInput } from "./use-inline-checklist-input";

export function InlineItemInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
  const { state, actions, inputRef } = useInlineChecklistInput(onSubmit, onDismiss);
  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <span className="shrink-0 text-quaternary"><GripVertical className="invisible size-4" /></span>
      <div className="flex flex-1 items-center gap-3">
        <div className="size-5 shrink-0 rounded border border-secondary bg-primary" />
        <Input aria-label="Checklist item label" name="checklist-item-label" ref={inputRef} style="ghost" className="label-sm flex-1 text-primary placeholder:text-quaternary" placeholder="Item label…" value={state.value} onChange={actions.handleChange} onKeyDown={actions.handleKeyDown} onBlur={actions.submit} />
      </div>
    </div>
  );
}
