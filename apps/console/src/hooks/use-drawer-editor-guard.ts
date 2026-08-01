import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

type DrawerEditorGuardOptions = {
  close: () => void;
  discard: () => void;
  href: string;
  isDirty: boolean;
  isDirtyRef?: RefObject<boolean>;
  requestCloseRef?: RefObject<(() => void) | null>;
  save: () => Promise<boolean | void>;
};

export function useDrawerEditorGuard({ close, discard, href, isDirty, isDirtyRef, requestCloseRef, save }: DrawerEditorGuardOptions) {
  const navigate = useNavigate();
  const [isPromptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (isDirtyRef) isDirtyRef.current = isDirty;
  }, [isDirty, isDirtyRef]);

  useEffect(() => {
    if (requestCloseRef) requestCloseRef.current = () => setPromptOpen(true);
    return () => { if (requestCloseRef) requestCloseRef.current = null; };
  }, [requestCloseRef]);

  const requestClose = useCallback(() => {
    if (isDirty) setPromptOpen(true);
    else close();
  }, [close, isDirty]);

  function openFullPage() {
    if (isDirty) {
      setPromptOpen(true);
      return;
    }
    close();
    navigate(href);
  }

  async function saveAndClose() {
    const result = await save();
    if (result === false) return;
    setPromptOpen(false);
    close();
  }

  function discardAndClose() {
    discard();
    setPromptOpen(false);
    close();
  }

  function cancel() {
    setPromptOpen(false);
  }

  return { state: { isPromptOpen }, actions: { cancel, discardAndClose, openFullPage, requestClose, saveAndClose } };
}
