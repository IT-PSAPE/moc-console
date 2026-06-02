import type { BookingItem } from "@moc/types/equipment";
import { parseEquipmentQrPayload } from "./equipment-qr";

function normalizeScannedValue(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return "";
  }

  // Structured equipment QR (JSON) — the canonical format produced by the
  // per-equipment generator. Resolve straight to its equipment id.
  const payload = parseEquipmentQrPayload(trimmedValue);
  if (payload) {
    return payload.id;
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

export function findBookingItemFromScan(items: BookingItem[], rawValue: string) {
  const normalizedValue = normalizeScannedValue(rawValue);
  if (!normalizedValue) {
    return null;
  }

  return items.find((item) => item.equipmentId === normalizedValue || item.id === normalizedValue) ?? null;
}

// Scan progress is transient (a Set of item ids in component state); collection
// itself is a booking-level concern. "All scanned" just means every item in the
// booking has been ticked off this session.
export function areAllItemsScanned(items: BookingItem[], scannedItemIds: ReadonlySet<string>) {
  return items.length > 0 && items.every((item) => scannedItemIds.has(item.id));
}
