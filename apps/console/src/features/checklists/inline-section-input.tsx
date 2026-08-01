import { ChevronDown, GripVertical } from "lucide-react";
import { Input } from "@moc/ui/components/form/input";
import { useInlineChecklistInput } from "./use-inline-checklist-input";

export function InlineSectionInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
  const { state, actions, inputRef } = useInlineChecklistInput(onSubmit, onDismiss);
  return (
    <div className="flex items-center border-b border-secondary">
      <div className="pl-3"><GripVertical className="invisible size-4 text-quaternary" /></div>
      <div className="flex flex-1 items-center gap-3 px-2 py-2.5 pl-1.5">
        <ChevronDown className="size-4 shrink-0 text-tertiary" />
        <Input aria-label="Checklist section name" name="checklist-section-name" ref={inputRef} style="ghost" className="label-sm flex-1 text-primary placeholder:text-quaternary" placeholder="Section name…" value={state.value} onChange={actions.handleChange} onKeyDown={actions.handleKeyDown} onBlur={actions.submit} />
      </div>
    </div>
  );
}
