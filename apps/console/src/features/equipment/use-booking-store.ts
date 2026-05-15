import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { Booking } from "@moc/types/equipment";
import { updateBooking } from "@moc/data/mutate-booking";
import { getErrorMessage } from "@moc/utils/get-error-message";

// ─── State ──────────────────────────────────────────────

type BookingStoreState = {
  original: Booking;
  draft: Booking;
  isSaving: boolean;
  error: string | null;
};

type Action =
  | { type: "UPDATE_FIELD"; field: keyof Booking; value: Booking[keyof Booking] }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; booking: Booking }
  | { type: "SAVE_ERROR"; error: string }
  | { type: "DISCARD" }
  | { type: "RESET"; booking: Booking };

function reducer(state: BookingStoreState, action: Action): BookingStoreState {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case "SAVE_START":
      return { ...state, isSaving: true, error: null };
    case "SAVE_SUCCESS":
      return { original: action.booking, draft: action.booking, isSaving: false, error: null };
    case "SAVE_ERROR":
      return { ...state, draft: state.original, isSaving: false, error: action.error };
    case "DISCARD":
      return { ...state, draft: state.original, error: null };
    case "RESET":
      return { original: action.booking, draft: action.booking, isSaving: false, error: null };
  }
}

type UseBookingStoreOptions = {
  syncBooking?: (booking: Booking) => void;
};

// ─── Hook ───────────────────────────────────────────────

export function useBookingStore(initialBooking: Booking, options?: UseBookingStoreOptions) {
  const [state, dispatch] = useReducer(reducer, {
    original: initialBooking,
    draft: initialBooking,
    isSaving: false,
    error: null,
  });

  const isDirty = useMemo(
    () => JSON.stringify(state.draft) !== JSON.stringify(state.original),
    [state.draft, state.original],
  );

  useEffect(() => {
    if (state.original.id !== initialBooking.id || !isDirty) {
      dispatch({ type: "RESET", booking: initialBooking });
    }
  }, [initialBooking, isDirty, state.original.id]);

  const updateField = useCallback(<K extends keyof Booking>(field: K, value: Booking[K]) => {
    dispatch({ type: "UPDATE_FIELD", field, value });
  }, []);

  const save = useCallback(async () => {
    const previous = state.original;
    const next = state.draft;

    dispatch({ type: "SAVE_START" });
    options?.syncBooking?.(next);

    try {
      const persisted = await updateBooking(next);
      options?.syncBooking?.(persisted);
      dispatch({ type: "SAVE_SUCCESS", booking: persisted });
      return persisted;
    } catch (error) {
      const message = getErrorMessage(error, "Booking could not be saved. Please review the booking details and try again.");
      options?.syncBooking?.(previous);
      dispatch({ type: "SAVE_ERROR", error: message });
      throw new Error(message);
    }
  }, [options, state.draft, state.original]);

  const discard = useCallback(() => {
    dispatch({ type: "DISCARD" });
  }, []);

  const reset = useCallback((booking: Booking) => {
    dispatch({ type: "RESET", booking });
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
