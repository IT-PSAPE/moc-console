import { useEffect, useState, type ChangeEvent } from "react";
import type { Checklist } from "@moc/types/checklists";

export type ChecklistRunSubmit =
  | { kind: "template"; template: Checklist; name: string; description: string }
  | { kind: "blank"; name: string; description: string };

type UseCreateChecklistRunOptions = {
  initialName?: string;
  open: boolean;
  template: Checklist | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChecklistRunSubmit) => Promise<void> | void;
};

export function useCreateChecklistRun({ open, template, onOpenChange, onSubmit, initialName }: UseCreateChecklistRunOptions) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName ?? (template ? `${template.name} Run` : ""));
    setDescription(template?.description ?? "");
  }, [initialName, open, template]);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  function changeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  function changeDescription(event: ChangeEvent<HTMLInputElement>) {
    setDescription(event.target.value);
  }

  async function submit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const shared = { name: name.trim(), description: description.trim() };
      await onSubmit(template ? { kind: "template", template, ...shared } : { kind: "blank", ...shared });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state: { canSubmit, description, isSubmitting, name },
    actions: { changeDescription, changeName, submit },
    meta: { title: template ? `New run from “${template.name}”` : "New blank checklist run" },
  };
}
