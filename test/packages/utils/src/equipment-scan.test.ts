import { describe, expect, test } from "vitest"
import {
  areAllItemsScanned,
  buildEquipmentQrPayload,
  findBookingItemFromScan,
  normalizeScannedValue,
  parseEquipmentQrPayload,
} from "../../../../packages/utils/src/equipment-scan"

const items = [
  { id: "item-1", equipmentId: "eq-1", serialNumber: "SN-1" },
  { id: "item-2", equipmentId: "eq-2", serialNumber: "SN-2" },
]

describe("buildEquipmentQrPayload / parseEquipmentQrPayload", () => {
  test("round-trips id, name, serial number", () => {
    const encoded = buildEquipmentQrPayload({ id: "eq-1", name: "Shure SM58", serialNumber: "SN-1" })
    const decoded = parseEquipmentQrPayload(encoded)

    expect(decoded).toEqual({ id: "eq-1", name: "Shure SM58", serialNumber: "SN-1" })
  })

  test("returns null for non-JSON and for JSON without a string id", () => {
    expect(parseEquipmentQrPayload("not json")).toBeNull()
    expect(parseEquipmentQrPayload(JSON.stringify({ name: "no id" }))).toBeNull()
    expect(parseEquipmentQrPayload(JSON.stringify({ id: 123 }))).toBeNull()
  })
})

describe("normalizeScannedValue", () => {
  test("resolves a structured QR payload to its id", () => {
    const encoded = buildEquipmentQrPayload({ id: "eq-1", name: "Shure SM58", serialNumber: "SN-1" })
    expect(normalizeScannedValue(encoded)).toBe("eq-1")
  })

  test("resolves a deep link URL's query id or trailing path segment", () => {
    expect(normalizeScannedValue("https://moc.app/equipment?equipmentId=eq-9")).toBe("eq-9")
    expect(normalizeScannedValue("https://moc.app/equipment/eq-9")).toBe("eq-9")
  })

  test("falls back to the trimmed bare value", () => {
    expect(normalizeScannedValue("  eq-9  ")).toBe("eq-9")
    expect(normalizeScannedValue("")).toBe("")
  })
})

describe("findBookingItemFromScan", () => {
  test("matches by equipment id and by item id", () => {
    expect(findBookingItemFromScan(items, "eq-2")).toEqual(items[1])
    expect(findBookingItemFromScan(items, "item-1")).toEqual(items[0])
  })

  test("matches on serial number, including one carried in a structured QR payload", () => {
    expect(findBookingItemFromScan(items, "SN-2")).toEqual(items[1])

    const encoded = buildEquipmentQrPayload({ id: "unknown-id", name: "X", serialNumber: "SN-1" })
    expect(findBookingItemFromScan(items, encoded)).toEqual(items[0])
  })

  test("returns null when nothing matches", () => {
    expect(findBookingItemFromScan(items, "eq-999")).toBeNull()
    expect(findBookingItemFromScan(items, "")).toBeNull()
  })
})

describe("areAllItemsScanned", () => {
  test("false for an empty collection, false until every id is scanned, true once complete", () => {
    expect(areAllItemsScanned([], new Set())).toBe(false)
    expect(areAllItemsScanned(items, new Set(["item-1"]))).toBe(false)
    expect(areAllItemsScanned(items, new Set(["item-1", "item-2"]))).toBe(true)
  })
})
