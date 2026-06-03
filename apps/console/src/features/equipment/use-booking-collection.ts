import type { Booking, BookingItem } from "@moc/types/equipment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import { areAllItemsScanned, findBookingItemFromScan } from "./booking-scan-helpers";

type UseBookingCollectionOptions = {
  booking: Booking;
  onItemCollected: (item: BookingItem) => void;
  onItemAlreadyCollected: (item: BookingItem) => void;
  onUnknownCode: (rawValue: string) => void;
};

export function useBookingCollection({
  booking,
  onItemCollected,
  onItemAlreadyCollected,
  onUnknownCode,
}: UseBookingCollectionOptions) {
  // Per-session scan progress only — never persisted. The booking is marked
  // collected explicitly via its status (see handleSelectStatus in the screens),
  // not by scanning. These ticks just help confirm every item was gathered.
  const [scannedItemIds, setScannedItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const bookingRef = useRef(booking);
  const scannedItemIdsRef = useRef(scannedItemIds);
  const closeScannerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    bookingRef.current = booking;
  }, [booking]);

  useEffect(() => {
    scannedItemIdsRef.current = scannedItemIds;
  }, [scannedItemIds]);

  // Drop scan progress when the hook is pointed at a different booking.
  useEffect(() => {
    setScannedItemIds(new Set());
  }, [booking.id]);

  const handleDetected = useCallback((rawValue: string) => {
    const currentBooking = bookingRef.current;
    const matchedItem = findBookingItemFromScan(currentBooking.items, rawValue);

    if (!matchedItem) {
      onUnknownCode(rawValue);
      return;
    }

    if (scannedItemIdsRef.current.has(matchedItem.id)) {
      onItemAlreadyCollected(matchedItem);
      return;
    }

    const nextScanned = new Set(scannedItemIdsRef.current);
    nextScanned.add(matchedItem.id);
    scannedItemIdsRef.current = nextScanned;
    setScannedItemIds(nextScanned);
    onItemCollected(matchedItem);

    if (areAllItemsScanned(currentBooking.items, nextScanned)) {
      closeScannerRef.current();
    }
  }, [onItemAlreadyCollected, onItemCollected, onUnknownCode]);

  const scanner = useQrScanner({ onDetected: handleDetected });
  const closeScanner = scanner.actions.closeScanner;
  const scannerState = scanner.state;
  const scannerMeta = scanner.meta;
  const openScannerBase = scanner.actions.openScanner;

  useEffect(() => {
    closeScannerRef.current = closeScanner;
  }, [closeScanner]);

  const scannedCount = useMemo(
    () => booking.items.filter((item) => scannedItemIds.has(item.id)).length,
    [booking.items, scannedItemIds],
  );
  const totalCount = booking.items.length;
  const isComplete = useMemo(() => areAllItemsScanned(booking.items, scannedItemIds), [booking.items, scannedItemIds]);
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
      scannedCount,
      isComplete,
      totalCount,
      scannedItemIds,
      ...scannerState,
    },
    actions: {
      closeScanner,
      openScanner,
    },
    meta: scannerMeta,
  };
}
