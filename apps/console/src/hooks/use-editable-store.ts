import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

type Identifiable = { id: string };

type EditableStoreState<T> = {
  original: T;
  draft: T;
  isSaving: boolean;
  error: string | null;
  saveId: symbol | null;
};

type EditableStoreAction<T> =
  | { type: "UPDATE_FIELD"; field: keyof T; value: T[keyof T] }
  | { type: "SAVE_START"; saveId: symbol }
  | { type: "SAVE_SUCCESS"; value: T; submitted: T; saveId: symbol }
  | { type: "SAVE_ERROR"; error: string; saveId: symbol }
  | { type: "DISCARD" }
  | { type: "RESET"; value: T };

type UseEditableStoreOptions<T> = {
  persist: (value: T) => Promise<T>;
  errorMessage: string;
  sync?: (value: T) => void;
  prepare?: (value: T) => T;
};

function preserveNewerFields<T>(value: T, submitted: T, draft: T): T {
  const next = { ...value };
  // Field updates are immutable, so references also identify newer array/object edits.
  for (const field of Object.keys(draft as object) as (keyof T)[]) {
    if (!Object.is(draft[field], submitted[field])) next[field] = draft[field];
  }
  return next;
}

function reducer<T>(state: EditableStoreState<T>, action: EditableStoreAction<T>): EditableStoreState<T> {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case "SAVE_START":
      return { ...state, isSaving: true, error: null, saveId: action.saveId };
    case "SAVE_SUCCESS":
      if (state.saveId !== action.saveId) return state;
      return { original: action.value, draft: preserveNewerFields(action.value, action.submitted, state.draft), isSaving: false, error: null, saveId: null };
    case "SAVE_ERROR":
      if (state.saveId !== action.saveId) return state;
      return { ...state, isSaving: false, error: action.error, saveId: null };
    case "DISCARD":
      return { ...state, draft: state.original, error: null };
    case "RESET":
      return { original: action.value, draft: action.value, isSaving: false, error: null, saveId: null };
  }
}

export function useEditableStore<T extends Identifiable>(initialValue: T, options: UseEditableStoreOptions<T>) {
  const [state, dispatch] = useReducer(reducer<T>, {
    original: initialValue,
    draft: initialValue,
    isSaving: false,
    error: null,
    saveId: null,
  });
  const pendingSave = useRef<{ id: string; promise: Promise<T> } | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(state.draft) !== JSON.stringify(state.original),
    [state.draft, state.original],
  );

  useEffect(() => {
    if (state.original.id !== initialValue.id || (!isDirty && !state.isSaving)) dispatch({ type: "RESET", value: initialValue });
  }, [initialValue, isDirty, state.isSaving, state.original.id]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  const save = useCallback((): Promise<T> => {
    if (pendingSave.current?.id === state.original.id) return pendingSave.current.promise;
    const previous = state.original;
    const submitted = state.draft;
    const next = options.prepare?.(submitted) ?? submitted;
    const saveId = Symbol("save");

    dispatch({ type: "SAVE_START", saveId });
    const promise = Promise.resolve().then(async () => {
      try {
        options.sync?.(next);
        const persisted = await options.persist(next);
        options.sync?.(persisted);
        dispatch({ type: "SAVE_SUCCESS", value: persisted, submitted, saveId });
        return persisted;
      } catch (error) {
        const message = getErrorMessage(error, options.errorMessage);
        options.sync?.(previous);
        dispatch({ type: "SAVE_ERROR", error: message, saveId });
        throw new Error(message);
      } finally {
        if (pendingSave.current?.promise === promise) pendingSave.current = null;
      }
    });
    pendingSave.current = { id: previous.id, promise };
    return promise;
  }, [options, state.draft, state.original]);

  const discard = useCallback(() => dispatch({ type: "DISCARD" }), []);
  const reset = useCallback((value: T) => {
    pendingSave.current = null;
    dispatch({ type: "RESET", value });
  }, []);

  return {
    state: { original: state.original, draft: state.draft, isSaving: state.isSaving, error: state.error, isDirty },
    actions: { updateField, save, discard, reset },
  };
}
