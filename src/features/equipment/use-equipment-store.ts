import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { Equipment } from "@/types/equipment";
import { updateEquipment } from "@/data/mutate-equipment";
import { getErrorMessage } from "@/utils/get-error-message";

// ─── State ──────────────────────────────────────────────

type EquipmentStoreState = {
  original: Equipment;
  draft: Equipment;
  isSaving: boolean;
  error: string | null;
};

type Action =
  | { type: "UPDATE_FIELD"; field: keyof Equipment; value: Equipment[keyof Equipment] }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; equipment: Equipment }
  | { type: "SAVE_ERROR"; error: string }
  | { type: "DISCARD" }
  | { type: "RESET"; equipment: Equipment };

function reducer(state: EquipmentStoreState, action: Action): EquipmentStoreState {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case "SAVE_START":
      return { ...state, isSaving: true, error: null };
    case "SAVE_SUCCESS":
      return { original: action.equipment, draft: action.equipment, isSaving: false, error: null };
    case "SAVE_ERROR":
      return { ...state, draft: state.original, isSaving: false, error: action.error };
    case "DISCARD":
      return { ...state, draft: state.original, error: null };
    case "RESET":
      return { original: action.equipment, draft: action.equipment, isSaving: false, error: null };
  }
}

type UseEquipmentStoreOptions = {
  syncEquipment?: (equipment: Equipment) => void;
};

// ─── Hook ───────────────────────────────────────────────

export function useEquipmentStore(initialEquipment: Equipment, options?: UseEquipmentStoreOptions) {
  const [state, dispatch] = useReducer(reducer, {
    original: initialEquipment,
    draft: initialEquipment,
    isSaving: false,
    error: null,
  });

  const isDirty = useMemo(
    () => JSON.stringify(state.draft) !== JSON.stringify(state.original),
    [state.draft, state.original],
  );

  useEffect(() => {
    if (state.original.id !== initialEquipment.id || !isDirty) {
      dispatch({ type: "RESET", equipment: initialEquipment });
    }
  }, [initialEquipment, isDirty, state.original.id]);

  const updateField = useCallback(<K extends keyof Equipment>(field: K, value: Equipment[K]) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  const save = useCallback(async () => {
    const previous = state.original;
    const next = state.draft;

    dispatch({ type: "SAVE_START" });
    options?.syncEquipment?.(next);

    try {
      const persisted = await updateEquipment(next);
      options?.syncEquipment?.(persisted);
      dispatch({ type: "SAVE_SUCCESS", equipment: persisted });
      return persisted;
    } catch (error) {
      const message = getErrorMessage(error, "Equipment could not be saved. Please review the fields and try again.");
      options?.syncEquipment?.(previous);
      dispatch({ type: "SAVE_ERROR", error: message });
      throw new Error(message);
    }
  }, [options, state.draft, state.original]);

  const discard = useCallback(() => {
    dispatch({ type: "DISCARD" });
  }, []);

  const reset = useCallback((equipment: Equipment) => {
    dispatch({ type: "RESET", equipment });
  }, []);

  return {
    state: {
      original: state.original,
      draft: state.draft,
      isDirty,
      isSaving: state.isSaving,
      error: state.error,
    },
    actions: {
      updateField,
      save,
      discard,
      reset,
    },
  };
}
