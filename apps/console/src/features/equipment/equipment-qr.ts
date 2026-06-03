import type { Equipment } from "@moc/types/equipment";

// Canonical shape encoded into an equipment QR code. Kept here as the single
// source of truth so the generator and the booking scanner can't drift.
//
// Deliberately minimal: the scanner only needs `id`, so we drop the redundant
// deep-link `url` (it just repeated the id). A shorter payload encodes to a
// lower-version QR with larger modules, so a label printed small still scans
// reliably.
export type EquipmentQrPayload = {
  id: string;
  name: string;
  serialNumber: string;
};

export function buildEquipmentQrPayload(
  equipment: Pick<Equipment, "id" | "name" | "serialNumber">,
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
