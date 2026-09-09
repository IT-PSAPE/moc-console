import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useMemo, useReducer } from "react";

type Identifiable = { id: string };

type EditableStoreState<T> = {
  original: T;
  draft: T;
  isSaving: boolean;
  error: string | null;
};

type EditableStoreAction<T> =
  | { type: "UPDATE_FIELD"; field: keyof T; value: T[keyof T] }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; value: T }
  | { type: "SAVE_ERROR"; error: string; restoreDraft: boolean }
  | { type: "DISCARD" }
  | { type: "RESET"; value: T };

type UseEditableStoreOptions<T> = {
  persist: (value: T) => Promise<T>;
  errorMessage: string;
  sync?: (value: T) => void;
  prepare?: (value: T) => T;
  restoreDraftOnError?: boolean;
};

function reducer<T>(state: EditableStoreState<T>, action: EditableStoreAction<T>): EditableStoreState<T> {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case "SAVE_START":
      return { ...state, isSaving: true, error: null };
    case "SAVE_SUCCESS":
      return { original: action.value, draft: action.value, isSaving: false, error: null };
    case "SAVE_ERROR":
      return { ...state, draft: action.restoreDraft ? state.original : state.draft, isSaving: false, error: action.error };
    case "DISCARD":
      return { ...state, draft: state.original, error: null };
    case "RESET":
      return { original: action.value, draft: action.value, isSaving: false, error: null };
  }
}

export function useEditableStore<T extends Identifiable>(initialValue: T, options: UseEditableStoreOptions<T>) {
  const [state, dispatch] = useReducer(reducer<T>, {
    original: initialValue,
    draft: initialValue,
    isSaving: false,
    error: null,
  });

  const isDirty = useMemo(
    () => JSON.stringify(state.draft) !== JSON.stringify(state.original),
    [state.draft, state.original],
  );

  useEffect(() => {
    if (state.original.id !== initialValue.id || !isDirty) dispatch({ type: "RESET", value: initialValue });
  }, [initialValue, isDirty, state.original.id]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  const save = useCallback(async () => {
    const previous = state.original;
    const next = options.prepare?.(state.draft) ?? state.draft;

    dispatch({ type: "SAVE_START" });
    options.sync?.(next);

    try {
      const persisted = await options.persist(next);
      options.sync?.(persisted);
      dispatch({ type: "SAVE_SUCCESS", value: persisted });
      return persisted;
    } catch (error) {
      const message = getErrorMessage(error, options.errorMessage);
      options.sync?.(previous);
      dispatch({ type: "SAVE_ERROR", error: message, restoreDraft: options.restoreDraftOnError ?? true });
      throw new Error(message);
    }
  }, [options, state.draft, state.original]);

  const discard = useCallback(() => dispatch({ type: "DISCARD" }), []);
  const reset = useCallback((value: T) => dispatch({ type: "RESET", value }), []);

  return {
    state: { ...state, isDirty },
    actions: { updateField, save, discard, reset },
  };
}
