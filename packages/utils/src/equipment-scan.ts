// Shared equipment QR / scan parsing. Used by the console's booking scanner
// and the Telegram Mini App's native scan flow, so it lives here instead of
// being duplicated in both apps.

// Canonical shape encoded into an equipment QR code. Kept here as the single
// source of truth so the generator and every scanner can't drift.
//
// Deliberately minimal: scanners only need `id`, so we drop the redundant
// deep-link `url` (it just repeated the id). A shorter payload encodes to a
// lower-version QR with larger modules, so a label printed small still scans
// reliably.
export type EquipmentQrPayload = {
  id: string;
  name: string;
  serialNumber: string;
};

export function buildEquipmentQrPayload(
  equipment: { id: string; name: string; serialNumber: string },
): string {
  const payload: EquipmentQrPayload = {
    id: equipment.id,
    name: equipment.name,
    serialNumber: equipment.serialNumber,
  };
  return JSON.stringify(payload);
}

// Parses a scanned value as the structured equipment payload. Returns null for
// anything that isn't a JSON object carrying a non-empty string id, so callers
// can fall back to URL / bare-id handling.
export function parseEquipmentQrPayload(rawValue: string): EquipmentQrPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "id" in parsed &&
    typeof (parsed as { id: unknown }).id === "string" &&
    (parsed as { id: string }).id.length > 0
  ) {
    return parsed as EquipmentQrPayload;
  }

  return null;
}

export function normalizeScannedValue(rawValue: string): string {
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

export type ScannableBookingItem = { id: string; equipmentId: string; serialNumber?: string };

// Matches a scanned value against a booking's items by equipment id, item id,
// or serial number — a structured QR's serial number is checked too, since a
// scanner may be pointed at a label that only carries the serial.
export function findBookingItemFromScan<T extends ScannableBookingItem>(
  items: T[],
  rawValue: string,
): T | null {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return null;
  }

  const payload = parseEquipmentQrPayload(trimmedValue);
  const normalizedValue = normalizeScannedValue(trimmedValue);
  const candidates = [normalizedValue, payload?.serialNumber].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of candidates) {
    const match = items.find(
      (item) => item.equipmentId === candidate || item.id === candidate || item.serialNumber === candidate,
    );
    if (match) {
      return match;
    }
  }

  return null;
}

// Scan progress is transient (a Set of item ids held in component state);
// "all scanned" just means every item in the collection has been ticked off
// this session.
export function areAllItemsScanned(items: { id: string }[], scannedItemIds: ReadonlySet<string>): boolean {
  return items.length > 0 && items.every((item) => scannedItemIds.has(item.id));
}
