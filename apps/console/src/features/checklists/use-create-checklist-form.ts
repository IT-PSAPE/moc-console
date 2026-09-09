import { useState, type ChangeEvent } from "react";

type ChecklistDraft = { name: string; description: string };
const initialState: ChecklistDraft = { name: "", description: "" };

export function useCreateChecklistForm(onOpenChange: (open: boolean) => void, onCreate: (checklist: ChecklistDraft) => void) {
  const [form, setForm] = useState(initialState);
  const canSubmit = form.name.trim().length > 0;

  function changeName(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, name: event.target.value }));
  }

  function changeDescription(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, description: event.target.value }));
  }

  function reset() {
    setForm(initialState);
  }

  function changeOpen(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  }

  function submit() {
    if (!canSubmit) return;
    onCreate({ name: form.name.trim(), description: form.description.trim() });
    reset();
  }

  return { state: { canSubmit, form }, actions: { changeDescription, changeName, changeOpen, submit } };
}
