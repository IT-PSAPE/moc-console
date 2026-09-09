import { useEffect, useState, type ChangeEvent } from "react";
import type { Checklist } from "@moc/types/checklists";
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";

export type ChecklistRunSubmit =
  | { kind: "template"; template: Checklist; name: string; description: string; scheduledAt: string }
  | { kind: "blank"; name: string; description: string; scheduledAt: string };

type UseCreateChecklistRunOptions = {
  open: boolean;
  template: Checklist | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChecklistRunSubmit) => Promise<void> | void;
};

function currentDateTimeInput() {
  return formatUtcIsoForBrowserDateTimeInput(new Date().toISOString());
}

export function useCreateChecklistRun({ open, template, onOpenChange, onSubmit }: UseCreateChecklistRunOptions) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(currentDateTimeInput);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(template ? `${template.name} Run` : "");
    setDescription(template?.description ?? "");
    setScheduledAt(currentDateTimeInput());
  }, [open, template]);

  const canSubmit = name.trim().length > 0 && scheduledAt.length > 0 && !isSubmitting;

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
      const scheduledIso = parseBrowserDateTimeInputToUtcIso(scheduledAt);
      const shared = { name: name.trim(), description: description.trim(), scheduledAt: scheduledIso };
      await onSubmit(template ? { kind: "template", template, ...shared } : { kind: "blank", ...shared });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state: { canSubmit, description, isSubmitting, name, scheduledAt },
    actions: { changeDescription, changeName, setScheduledAt, submit },
    meta: { title: template ? `New run from “${template.name}”` : "New blank checklist run" },
  };
}
