import { useCallback, useEffect, useRef, useState } from "react";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";

export function useCopyFeedback<Field extends string>(duration = 2000) {
  const { toast } = useFeedback();
  const [copiedField, setCopiedField] = useState<Field | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(async (text: string | null | undefined, field: Field) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copied to clipboard", variant: "success" });
    } catch {
      setCopiedField(null);
      toast({ title: "Could not copy to the clipboard", description: "Try again.", variant: "error" });
    }
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
    }, duration);
  }, [duration, toast]);

  return { state: { copiedField }, actions: { copy } };
}
