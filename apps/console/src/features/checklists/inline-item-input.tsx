import { Input } from "@moc/ui/components/form/input";
import { useInlineChecklistInput } from "./use-inline-checklist-input";

export function InlineItemInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
  const { state, actions, inputRef } = useInlineChecklistInput(onSubmit, onDismiss);
  return (
    <div className="flex min-h-control items-center gap-3 pr-5">
      <div className="size-4 shrink-0 rounded border border-primary bg-primary shadow-xs" />
      <Input aria-label="Checklist item label" name="checklist-item-label" ref={inputRef} style="ghost" className="flex-1" placeholder="Item label…" value={state.value} onChange={actions.handleChange} onKeyDown={actions.handleKeyDown} onBlur={actions.submit} />
    </div>
  );
}
