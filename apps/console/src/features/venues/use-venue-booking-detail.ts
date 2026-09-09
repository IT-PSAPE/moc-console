import { useCallback, useEffect, useState } from "react";
import { getCurrentWorkspaceGeneration } from "@/data/current-workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { useVenueBookings } from "./venue-bookings-provider";

type VenueBookingSnapshot = {
  attempt: number;
  generation: number;
  id: string | undefined;
  workspaceId: string | null;
};

function getSnapshotKey({ attempt, generation, id, workspaceId }: VenueBookingSnapshot) {
  return `${workspaceId ?? "none"}:${generation}:${id ?? "none"}:${attempt}`;
}

/** Loads a single venue booking by id for the standalone /venues/:id route. */
export function useVenueBookingDetail(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace();
  const { state, actions } = useVenueBookings();
  const { loadBooking } = actions;
  const generation = getCurrentWorkspaceGeneration();
  const [attempt, setAttempt] = useState(0);
  const snapshot = { attempt, generation, id, workspaceId: currentWorkspaceId };
  const snapshotKey = getSnapshotKey(snapshot);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const booking = id ? state.bookingsById[id] ?? null : null;

  useEffect(() => {
    if (!id || !currentWorkspaceId) return;

    let cancelled = false;
    const requestedSnapshot = { attempt, generation, id, workspaceId: currentWorkspaceId };

    void loadBooking(id)
      .then(() => {
        if (cancelled) return;
        setError(null);
        setSettledKey(getSnapshotKey(requestedSnapshot));
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason : new Error("Failed to load this venue booking"));
        setSettledKey(getSnapshotKey(requestedSnapshot));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, currentWorkspaceId, generation, id, loadBooking]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, [setAttempt]);

  const isCurrent = settledKey === snapshotKey;

  return {
    state: {
      booking,
      error: isCurrent ? error : null,
      isLoading: Boolean(!booking && id && currentWorkspaceId && !isCurrent),
    },
    actions: { retry },
  };
}
