import type { Equipment } from "@/types/equipment/equipment";
import type { Booking } from "@/types/equipment/booking";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms));

// ─── Mock Equipment ────────────────────────────────────

const MOCK_EQUIPMENT: Equipment[] = [
  // Cameras
  { id: "eq-001", name: "Sony A7S III", serialNumber: "SN-CAM-001", category: "camera", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-28", bookedBy: null, thumbnail: null },
  { id: "eq-002", name: "Canon C70", serialNumber: "SN-CAM-002", category: "camera", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-01", bookedBy: "Thabiso Mkhize", thumbnail: null },
  { id: "eq-003", name: "Blackmagic URSA Mini Pro 12K", serialNumber: "SN-CAM-003", category: "camera", status: "available", location: "Storage Room B", notes: "", lastActiveDate: "2026-03-20", bookedBy: null, thumbnail: null },
  { id: "eq-004", name: "Sony FX6", serialNumber: "SN-CAM-004", category: "camera", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-02", bookedBy: "Naledi Dlamini", thumbnail: null },
  { id: "eq-005", name: "Canon R5 C", serialNumber: "SN-CAM-005", category: "camera", status: "maintenance", location: "Repair Shop", notes: "Sensor overheating — sent for repair", lastActiveDate: "2026-03-15", bookedBy: null, thumbnail: null },

  // Lenses
  { id: "eq-006", name: "Canon RF 24-70mm f/2.8L", serialNumber: "SN-LNS-001", category: "lens", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-25", bookedBy: null, thumbnail: null },
  { id: "eq-007", name: "Sony FE 70-200mm f/2.8 GM II", serialNumber: "SN-LNS-002", category: "lens", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-01", bookedBy: "Thabiso Mkhize", thumbnail: null },
  { id: "eq-008", name: "Sigma 18-35mm f/1.8 Art", serialNumber: "SN-LNS-003", category: "lens", status: "available", location: "Storage Room B", notes: "Minor scratch on front element", lastActiveDate: "2026-03-10", bookedBy: null, thumbnail: null },

  // Lighting
  { id: "eq-009", name: "Aputure 600D Pro", serialNumber: "SN-LGT-001", category: "lighting", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-30", bookedBy: null, thumbnail: null },
  { id: "eq-010", name: "Aputure 300X", serialNumber: "SN-LGT-002", category: "lighting", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-02", bookedBy: "Sipho Ndaba", thumbnail: null },
  { id: "eq-011", name: "Nanlite Forza 500 II", serialNumber: "SN-LGT-003", category: "lighting", status: "available", location: "Studio B", notes: "", lastActiveDate: "2026-03-22", bookedBy: null, thumbnail: null },
  { id: "eq-012", name: "Godox SL200 III", serialNumber: "SN-LGT-004", category: "lighting", status: "maintenance", location: "Repair Shop", notes: "Fan motor failure — awaiting replacement part", lastActiveDate: "2026-03-18", bookedBy: null, thumbnail: null },

  // Audio
  { id: "eq-013", name: "Sennheiser MKH 416", serialNumber: "SN-AUD-001", category: "audio", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-27", bookedBy: null, thumbnail: null },
  { id: "eq-014", name: "Rode NTG5", serialNumber: "SN-AUD-002", category: "audio", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-01", bookedBy: "Naledi Dlamini", thumbnail: null },
  { id: "eq-015", name: "Zoom F6 Recorder", serialNumber: "SN-AUD-003", category: "audio", status: "available", location: "Storage Room A", notes: "", lastActiveDate: "2026-03-24", bookedBy: null, thumbnail: null },
  { id: "eq-016", name: "Sennheiser EW 112P G4 Wireless", serialNumber: "SN-AUD-004", category: "audio", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-03-31", bookedBy: "Sipho Ndaba", thumbnail: null },

  // Support
  { id: "eq-017", name: "DJI RS 3 Pro", serialNumber: "SN-SUP-001", category: "support", status: "available", location: "Storage Room B", notes: "", lastActiveDate: "2026-03-26", bookedBy: null, thumbnail: null },
  { id: "eq-018", name: "Sachtler Ace XL Tripod", serialNumber: "SN-SUP-002", category: "support", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-19", bookedBy: null, thumbnail: null },
  { id: "eq-019", name: "Manfrotto 504X Fluid Head Tripod", serialNumber: "SN-SUP-003", category: "support", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-02", bookedBy: "Thabiso Mkhize", thumbnail: null },

  // Monitors
  { id: "eq-020", name: "SmallHD Cine 7", serialNumber: "SN-MON-001", category: "monitor", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-29", bookedBy: null, thumbnail: null },
  { id: "eq-021", name: "Atomos Ninja V+", serialNumber: "SN-MON-002", category: "monitor", status: "maintenance", location: "Repair Shop", notes: "HDMI port loose — needs resoldering", lastActiveDate: "2026-03-12", bookedBy: null, thumbnail: null },

  // Cables
  { id: "eq-022", name: "SDI Cable 50m", serialNumber: "SN-CBL-001", category: "cable", status: "available", location: "Storage Room A", notes: "", lastActiveDate: "2026-03-14", bookedBy: null, thumbnail: null },
  { id: "eq-023", name: "HDMI 2.1 Cable 5m", serialNumber: "SN-CBL-002", category: "cable", status: "available", location: "Storage Room A", notes: "", lastActiveDate: "2026-03-16", bookedBy: null, thumbnail: null },

  // Accessories
  { id: "eq-024", name: "V-Mount Battery 150Wh", serialNumber: "SN-ACC-001", category: "accessory", status: "available", location: "Storage Room B", notes: "", lastActiveDate: "2026-03-21", bookedBy: null, thumbnail: null },
  { id: "eq-025", name: "Sony NP-FZ100 Battery (x4)", serialNumber: "SN-ACC-002", category: "accessory", status: "retired", location: "Storage Room B", notes: "No longer holds charge", lastActiveDate: "2026-02-28", bookedBy: null, thumbnail: null },
];

// ─── Mock Bookings ─────────────────────────────────────

const MOCK_BOOKINGS: Booking[] = [
  { id: "bk-001", equipmentId: "eq-002", equipmentName: "Canon C70", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-04-01", returnedDate: null, duration: "3 days", notes: "Documentary shoot at Newlands", status: "checked_out" },
  { id: "bk-002", equipmentId: "eq-004", equipmentName: "Sony FX6", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-04-02", returnedDate: null, duration: "2 days", notes: "Corporate interview", status: "checked_out" },
  { id: "bk-003", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-04-01", returnedDate: null, duration: "3 days", notes: "Paired with Canon C70", status: "checked_out" },
  { id: "bk-004", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-04-02", returnedDate: null, duration: "1 day", notes: "Studio B lighting setup", status: "checked_out" },
  { id: "bk-005", equipmentId: "eq-014", equipmentName: "Rode NTG5", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-04-01", returnedDate: null, duration: "2 days", notes: "Interview audio", status: "checked_out" },
  { id: "bk-006", equipmentId: "eq-016", equipmentName: "Sennheiser EW 112P G4 Wireless", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-03-31", returnedDate: null, duration: "3 days", notes: "Presenter mic for live event", status: "checked_out" },
  { id: "bk-007", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-04-02", returnedDate: null, duration: "3 days", notes: "", status: "checked_out" },
  { id: "bk-008", equipmentId: "eq-001", equipmentName: "Sony A7S III", bookedBy: "Lerato Mokoena", checkedOutDate: "2026-03-24", returnedDate: "2026-03-28", duration: "4 days", notes: "BTS content for social media", status: "returned" },
  { id: "bk-009", equipmentId: "eq-009", equipmentName: "Aputure 600D Pro", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-03-27", returnedDate: "2026-03-30", duration: "3 days", notes: "Studio A key light", status: "returned" },
  { id: "bk-010", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-03-22", returnedDate: "2026-03-26", duration: "4 days", notes: "Gimbal work for music video", status: "returned" },
  { id: "bk-011", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-03-25", returnedDate: "2026-03-29", duration: "4 days", notes: "Director's monitor", status: "returned" },
  { id: "bk-012", equipmentId: "eq-003", equipmentName: "Blackmagic URSA Mini Pro 12K", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-03-15", returnedDate: "2026-03-20", duration: "5 days", notes: "High-res commercial shoot", status: "returned" },
];

// ─── Fetch Functions ───────────────────────────────────

export async function fetchEquipment(): Promise<Equipment[]> {
  await delay(200);
  return MOCK_EQUIPMENT;
}

export async function fetchEquipmentById(id: string): Promise<Equipment | undefined> {
  await delay(100);
  return MOCK_EQUIPMENT.find((e) => e.id === id);
}

export async function fetchBookings(): Promise<Booking[]> {
  await delay(200);
  return MOCK_BOOKINGS;
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  await delay(100);
  return MOCK_BOOKINGS.filter((b) => b.equipmentId === equipmentId);
}
