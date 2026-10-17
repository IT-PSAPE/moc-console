import { ChevronDown } from "lucide-react";
import { Input } from "@moc/ui/components/form/input";
import { useInlineChecklistInput } from "./use-inline-checklist-input";

export function InlineSectionInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
  const { state, actions, inputRef } = useInlineChecklistInput(onSubmit, onDismiss);
  return (
    <div className="flex items-center gap-3 border-b border-secondary pt-4 pb-2 pr-5">
      <ChevronDown className="size-4 shrink-0 text-tertiary" />
      <Input aria-label="Checklist section name" name="checklist-section-name" ref={inputRef} style="ghost" className="flex-1" placeholder="Section name…" value={state.value} onChange={actions.handleChange} onKeyDown={actions.handleKeyDown} onBlur={actions.submit} />
    </div>
  );
}
