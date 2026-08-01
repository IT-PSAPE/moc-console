import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

export function useInlineChecklistInput(onSubmit: (value: string) => void, onDismiss: () => void) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue("");
    }
    onDismiss();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") submit();
    if (event.key === "Escape") {
      onDismiss();
      setValue("");
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
  }

  return { state: { value }, actions: { handleChange, handleKeyDown, submit }, inputRef };
}
