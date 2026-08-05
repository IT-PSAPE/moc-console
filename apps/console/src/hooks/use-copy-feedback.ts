import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyFeedback<Field extends string>(duration = 2000) {
  const [copiedField, setCopiedField] = useState<Field | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(async (text: string | null | undefined, field: Field) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopiedField(null);
      setCopyMessage("Could not copy to the clipboard. Try again.");
    }
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
      setCopyMessage(null);
    }, duration);
  }, [duration]);

  return { state: { copiedField, copyMessage }, actions: { copy } };
}
