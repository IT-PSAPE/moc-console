import type { Booking, BookingItem } from "@moc/types/equipment";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import {
  areAllBookingItemsCollected,
  buildCollectedBookingDraft,
  countCollectedBookingItems,
  findBookingItemFromScan,
} from "./booking-scan-helpers";

type UseBookingCollectionOptions = {
  booking: Booking;
  onDraftChange: (booking: Booking) => void;
  onCollectionComplete: (booking: Booking) => Promise<void>;
  onItemCollected: (item: BookingItem) => void;
  onItemAlreadyCollected: (item: BookingItem) => void;
  onUnknownCode: (rawValue: string) => void;
};

export function useBookingCollection({
  booking,
  onDraftChange,
  onCollectionComplete,
  onItemCollected,
  onItemAlreadyCollected,
  onUnknownCode,
}: UseBookingCollectionOptions) {
  const bookingRef = useRef(booking);
  const closeScannerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    bookingRef.current = booking;
  }, [booking]);

  const handleDetected = useCallback(async (rawValue: string) => {
    const currentBooking = bookingRef.current;
    const matchedItem = findBookingItemFromScan(currentBooking.items, rawValue);

    if (!matchedItem) {
      onUnknownCode(rawValue);
      return;
    }

    if (matchedItem.collectedAt) {
      onItemAlreadyCollected(matchedItem);
      return;
    }

    const collectedAt = new Date().toISOString();
    const nextBooking = buildCollectedBookingDraft(currentBooking, matchedItem.id, collectedAt);
    const updatedItem = nextBooking.items.find((item) => item.id === matchedItem.id);

    bookingRef.current = nextBooking;
    onDraftChange(nextBooking);

    if (updatedItem) {
      onItemCollected(updatedItem);
    }

    if (areAllBookingItemsCollected(nextBooking.items)) {
      closeScannerRef.current();
      await onCollectionComplete(nextBooking);
    }
  }, [onCollectionComplete, onDraftChange, onItemAlreadyCollected, onItemCollected, onUnknownCode]);

  const scanner = useQrScanner({ onDetected: handleDetected });
  const closeScanner = scanner.actions.closeScanner;
  const scannerState = scanner.state;
  const scannerMeta = scanner.meta;
  const openScannerBase = scanner.actions.openScanner;

  useEffect(() => {
    closeScannerRef.current = closeScanner;
  }, [closeScanner]);

  const collectedCount = useMemo(() => countCollectedBookingItems(booking.items), [booking.items]);
  const totalCount = booking.items.length;
  const isComplete = useMemo(() => areAllBookingItemsCollected(booking.items), [booking.items]);
  const canScan = totalCount > 0 && !isComplete;

  const openScanner = useCallback(() => {
    if (!canScan) {
      return;
    }
    openScannerBase();
  }, [canScan, openScannerBase]);

  return {
    state: {
      canScan,
      collectedCount,
      isComplete,
      totalCount,
      ...scannerState,
    },
    actions: {
      closeScanner,
      openScanner,
    },
    meta: scannerMeta,
  };
}
