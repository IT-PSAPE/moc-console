import type { Booking, BookingItem } from "@moc/types/equipment";

function normalizeScannedValue(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const queryId = parsedUrl.searchParams.get("equipmentId") ?? parsedUrl.searchParams.get("id");
    return queryId ?? pathSegments[pathSegments.length - 1] ?? trimmedValue;
  } catch {
    return trimmedValue.split("/").filter(Boolean).pop() ?? trimmedValue;
  }
}

export function countCollectedBookingItems(items: BookingItem[]) {
  return items.filter((item) => item.collectedAt).length;
}

export function areAllBookingItemsCollected(items: BookingItem[]) {
  return items.length > 0 && countCollectedBookingItems(items) === items.length;
}

export function findBookingItemFromScan(items: BookingItem[], rawValue: string) {
  const normalizedValue = normalizeScannedValue(rawValue);
  if (!normalizedValue) {
    return null;
  }

  return items.find((item) => item.equipmentId === normalizedValue || item.id === normalizedValue) ?? null;
}

export function buildCollectedBookingDraft(booking: Booking, itemId: string, collectedAt: string) {
  const nextItems = booking.items.map((item) => {
    if (item.id !== itemId || item.collectedAt) {
      return item;
    }

    return {
      ...item,
      collectedAt,
    };
  });

  return {
    ...booking,
    items: nextItems,
    status: areAllBookingItemsCollected(nextItems) && booking.status === "booked" ? "checked_out" : booking.status,
  };
}
