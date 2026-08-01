import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyFeedback<Field extends string>(duration = 2000) {
  const [copiedField, setCopiedField] = useState<Field | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback((text: string | null | undefined, field: Field) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopiedField(null), duration);
  }, [duration]);

  return { state: { copiedField }, actions: { copy } };
}
