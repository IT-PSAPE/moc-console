# Per-equipment QR generator + JSON-aware scanner

**Date:** 2026-06-01
**Status:** Approved
**Branch:** `fix/booking-collection-redesign` (continues from the booking-collection redesign, whose scanner helpers this builds on)

## Goal

Generate a printable QR code for each equipment item. The QR encodes a
structured JSON payload (name, serial number, id, url). The booking QR scanner
parses that payload to identify the equipment, so a printed label stuck on the
gear can be scanned during booking collection.

## Payload format (single source of truth)

A new module `apps/console/src/features/equipment/equipment-qr.ts` owns the
encoding so the generator and scanner cannot drift:

```ts
type EquipmentQrPayload = { id: string; name: string; serialNumber: string; url: string };

buildEquipmentQrPayload(equipment) → string          // JSON.stringify(payload)
parseEquipmentQrPayload(rawValue)  → EquipmentQrPayload | null   // JSON.parse + shape guard
```

The QR encodes exactly the four requested fields:

```json
{ "id": "…", "name": "…", "serialNumber": "…", "url": "https://…/equipment/…" }
```

- `url` is the console deep link: `${window.location.origin}/equipment/${id}`.
  (`APP_BASE_URL` is not exposed to the browser by Vite; the app already builds
  client links from `window.location.origin`.)
- `parseEquipmentQrPayload` returns the payload only when the parsed value is an
  object with a non-empty string `id`; otherwise `null`.

## QR section component — `equipment-qr-section.tsx`

A new "QR Code" section on the equipment detail page, placed after Booking
History behind a `<Divider>` (matching the Properties / Notes / History section
pattern).

- Renders `<QRCodeCanvas>` from `qrcode.react` with `value = buildEquipmentQrPayload(equipment)`,
  on a white padded surface (contrast in dark mode), with a built-in quiet-zone
  margin so the exported image scans reliably.
- Shows the equipment **name + serial** as a human-readable caption.
- **Download** — `canvas.toDataURL("image/png")` → downloads `<name>-<serial>.png`.
- **Print** — opens a minimal print window containing only the QR image + caption
  and calls `print()`, producing a clean physical label (not the whole page).
- Reads from the page's `draft`, so name/serial reflect unsaved edits already on
  screen.

Mounted in `apps/console/src/screens/equipment/detail/page.tsx` as
`<EquipmentQrSection equipment={draft} />`.

## Scanner becomes JSON-aware

Extend `normalizeScannedValue` in
`apps/console/src/features/equipment/booking-scan-helpers.ts` to resolve a scan
in this order:

1. **JSON** — `parseEquipmentQrPayload(raw)`; if it returns a payload, use its
   `id` (the new equipment QR).
2. **URL** — existing `equipmentId` / `id` query param or last path segment.
3. **Bare id** — existing last-segment fallback.

`findBookingItemFromScan` already matches the resolved value against
`item.equipmentId`, so scanning the new QR during booking collection ticks the
correct item. Existing URL / bare-id QRs keep working.

## Files

- **New:** `equipment-qr.ts`, `equipment-qr-section.tsx`
- **Edit:** `screens/equipment/detail/page.tsx` (mount the section),
  `booking-scan-helpers.ts` (JSON-aware resolve)
- **Dependency:** add `qrcode.react` to `apps/console` (ships its own types)

## Out of scope

- No database or `Equipment` type changes — the QR is derived from existing
  fields.
- Scoped to the equipment detail page. The section component is reusable if the
  QR is later wanted elsewhere (e.g. an equipment drawer).
- Camera/scanning hardware (`use-qr-scanner.ts`) is unchanged; only the value
  interpretation (`normalizeScannedValue`) is extended.
