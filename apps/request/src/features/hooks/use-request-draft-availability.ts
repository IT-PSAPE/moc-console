import { clearRequestDraft, loadRequestDraft } from "@/data/request-draft-storage";
import { useCallback, useState } from "react";

export function useRequestDraftAvailability() {
  const [hasDraft, setHasDraft] = useState(() => loadRequestDraft() !== null);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const requestDiscard = useCallback(() => {
    setIsDiscardOpen(true);
  }, []);

  const setDiscardOpen = useCallback((open: boolean) => {
    setIsDiscardOpen(open);
  }, []);

  const confirmDiscard = useCallback(() => {
    clearRequestDraft();
    setHasDraft(false);
    setIsDiscardOpen(false);
  }, []);

  return { state: { hasDraft, isDiscardOpen }, actions: { requestDiscard, setDiscardOpen, confirmDiscard } };
}
