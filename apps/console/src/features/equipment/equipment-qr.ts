import type { Equipment } from "@moc/types/equipment";

// Canonical shape encoded into an equipment QR code. Kept here as the single
// source of truth so the generator and the booking scanner can't drift.
export type EquipmentQrPayload = {
  id: string;
  name: string;
  serialNumber: string;
  url: string;
};

// Console deep link for the item. APP_BASE_URL is not exposed to the browser by
// Vite, so we build from the current origin like the rest of the app does.
export function buildEquipmentQrUrl(id: string): string {
  return `${window.location.origin}/equipment/${id}`;
}

export function buildEquipmentQrPayload(
  equipment: Pick<Equipment, "id" | "name" | "serialNumber">,
): string {
  const payload: EquipmentQrPayload = {
    id: equipment.id,
    name: equipment.name,
    serialNumber: equipment.serialNumber,
    url: buildEquipmentQrUrl(equipment.id),
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
