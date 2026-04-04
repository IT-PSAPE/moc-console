import type { Equipment } from "@/types/equipment/equipment";
import type { Booking } from "@/types/equipment/booking";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms));

// ─── Mock Equipment ────────────────────────────────────

const MOCK_EQUIPMENT: Equipment[] = [
  // Cameras
  { id: "eq-001", name: "Sony A7S III", serialNumber: "SN-CAM-001", category: "camera", status: "available", location: "Studio A", notes: "", lastActiveDate: "2026-03-28", bookedBy: null, thumbnail: null },
  { id: "eq-002", name: "Canon C70", serialNumber: "SN-CAM-002", category: "camera", status: "booked_out", location: "Field", notes: "", lastActiveDate: "2026-04-01", bookedBy: "Thabiso Mkhize", thumbnail: null },
  { id: "eq-003", name: "Blackmagic URSA Mini Pro 12K", serialNumber: "SN-CAM-003", category: "camera", status: "booked", location: "Storage Room B", notes: "", lastActiveDate: "2026-04-03", bookedBy: "Kagiso Molefe", thumbnail: null },
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
  { id: "eq-015", name: "Zoom F6 Recorder", serialNumber: "SN-AUD-003", category: "audio", status: "booked", location: "Storage Room A", notes: "", lastActiveDate: "2026-04-03", bookedBy: "Ayanda Nene", thumbnail: null },
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
  { id: "eq-025", name: "Sony NP-FZ100 Battery (x4)", serialNumber: "SN-ACC-002", category: "accessory", status: "available", location: "Storage Room B", notes: "", lastActiveDate: "2026-02-28", bookedBy: null, thumbnail: null },
];

// ─── Mock Bookings ─────────────────────────────────────

const MOCK_BOOKINGS: Booking[] = [
  { id: "bk-067", equipmentId: "eq-003", equipmentName: "Blackmagic URSA Mini Pro 12K", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-04-04", returnedDate: null, duration: "3 days", notes: "Commercial shoot prep", status: "booked" },
  { id: "bk-068", equipmentId: "eq-015", equipmentName: "Zoom F6 Recorder", bookedBy: "Ayanda Nene", checkedOutDate: "2026-04-05", returnedDate: null, duration: "2 days", notes: "Field recording session", status: "booked" },
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
  { id: "bk-013", equipmentId: "eq-001", equipmentName: "Sony A7S III", bookedBy: "Thando Jacobs", checkedOutDate: "2026-02-18", returnedDate: "2026-02-20", duration: "2 days", notes: "Short-form campaign pickup shots", status: "returned" },
  { id: "bk-014", equipmentId: "eq-001", equipmentName: "Sony A7S III", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-01-27", returnedDate: "2026-01-31", duration: "4 days", notes: "Studio B product hero clips", status: "returned" },
  { id: "bk-015", equipmentId: "eq-001", equipmentName: "Sony A7S III", bookedBy: "Naledi Dlamini", checkedOutDate: "2025-12-09", returnedDate: "2025-12-12", duration: "3 days", notes: "Social launch content", status: "returned" },
  { id: "bk-016", equipmentId: "eq-001", equipmentName: "Sony A7S III", bookedBy: "Lerato Mokoena", checkedOutDate: "2025-10-22", returnedDate: "2025-10-26", duration: "4 days", notes: "Behind-the-scenes stills and reels", status: "returned" },
  { id: "bk-017", equipmentId: "eq-002", equipmentName: "Canon C70", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-03-14", returnedDate: "2026-03-17", duration: "3 days", notes: "Client testimonial interviews", status: "returned" },
  { id: "bk-018", equipmentId: "eq-002", equipmentName: "Canon C70", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-02-03", returnedDate: "2026-02-07", duration: "4 days", notes: "Retail launch recap", status: "returned" },
  { id: "bk-019", equipmentId: "eq-002", equipmentName: "Canon C70", bookedBy: "Thabiso Mkhize", checkedOutDate: "2025-12-01", returnedDate: "2025-12-05", duration: "4 days", notes: "Documentary pickup interviews", status: "returned" },
  { id: "bk-020", equipmentId: "eq-002", equipmentName: "Canon C70", bookedBy: "Ayanda Nene", checkedOutDate: "2025-09-18", returnedDate: "2025-09-21", duration: "3 days", notes: "School outreach mini-doc", status: "returned" },
  { id: "bk-021", equipmentId: "eq-003", equipmentName: "Blackmagic URSA Mini Pro 12K", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-02-10", returnedDate: "2026-02-14", duration: "4 days", notes: "Luxury auto campaign plates", status: "returned" },
  { id: "bk-022", equipmentId: "eq-003", equipmentName: "Blackmagic URSA Mini Pro 12K", bookedBy: "Lerato Mokoena", checkedOutDate: "2025-11-11", returnedDate: "2025-11-16", duration: "5 days", notes: "High-res greenscreen capture", status: "returned" },
  { id: "bk-023", equipmentId: "eq-003", equipmentName: "Blackmagic URSA Mini Pro 12K", bookedBy: "Sipho Ndaba", checkedOutDate: "2025-08-20", returnedDate: "2025-08-24", duration: "4 days", notes: "Studio product motion control shoot", status: "returned" },
  { id: "bk-024", equipmentId: "eq-004", equipmentName: "Sony FX6", bookedBy: "Lerato Mokoena", checkedOutDate: "2026-03-05", returnedDate: "2026-03-09", duration: "4 days", notes: "Night exterior test shoot", status: "returned" },
  { id: "bk-025", equipmentId: "eq-004", equipmentName: "Sony FX6", bookedBy: "Ayanda Nene", checkedOutDate: "2025-12-15", returnedDate: "2025-12-18", duration: "3 days", notes: "Event recap coverage", status: "returned" },
  { id: "bk-026", equipmentId: "eq-004", equipmentName: "Sony FX6", bookedBy: "Thabiso Mkhize", checkedOutDate: "2025-10-07", returnedDate: "2025-10-10", duration: "3 days", notes: "Run-and-gun branded content", status: "returned" },
  { id: "bk-027", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-03-14", returnedDate: "2026-03-17", duration: "3 days", notes: "Sports portrait session", status: "returned" },
  { id: "bk-028", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-02-19", returnedDate: "2026-02-22", duration: "3 days", notes: "Conference stage coverage", status: "returned" },
  { id: "bk-029", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-01-12", returnedDate: "2026-01-16", duration: "4 days", notes: "Telephoto inserts for automotive spot", status: "returned" },
  { id: "bk-030", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Thando Jacobs", checkedOutDate: "2025-11-03", returnedDate: "2025-11-05", duration: "2 days", notes: "Live performance coverage", status: "returned" },
  { id: "bk-031", equipmentId: "eq-007", equipmentName: "Sony FE 70-200mm f/2.8 GM II", bookedBy: "Lerato Mokoena", checkedOutDate: "2025-09-24", returnedDate: "2025-09-27", duration: "3 days", notes: "Wildlife b-roll day trip", status: "returned" },
  { id: "bk-032", equipmentId: "eq-009", equipmentName: "Aputure 600D Pro", bookedBy: "Ayanda Nene", checkedOutDate: "2026-02-24", returnedDate: "2026-02-26", duration: "2 days", notes: "Key light for CEO portrait setup", status: "returned" },
  { id: "bk-033", equipmentId: "eq-009", equipmentName: "Aputure 600D Pro", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-01-21", returnedDate: "2026-01-24", duration: "3 days", notes: "Studio cyc wall lighting", status: "returned" },
  { id: "bk-034", equipmentId: "eq-009", equipmentName: "Aputure 600D Pro", bookedBy: "Kagiso Molefe", checkedOutDate: "2025-11-27", returnedDate: "2025-11-30", duration: "3 days", notes: "Fashion editorial key light", status: "returned" },
  { id: "bk-035", equipmentId: "eq-009", equipmentName: "Aputure 600D Pro", bookedBy: "Thabiso Mkhize", checkedOutDate: "2025-10-14", returnedDate: "2025-10-18", duration: "4 days", notes: "Warehouse interview lighting package", status: "returned" },
  { id: "bk-036", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-03-20", returnedDate: "2026-03-21", duration: "1 day", notes: "Accent light for tabletop shoot", status: "returned" },
  { id: "bk-037", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Lerato Mokoena", checkedOutDate: "2026-03-01", returnedDate: "2026-03-03", duration: "2 days", notes: "Hair light for interview kit", status: "returned" },
  { id: "bk-038", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Ayanda Nene", checkedOutDate: "2026-02-11", returnedDate: "2026-02-12", duration: "1 day", notes: "Backlight for food campaign", status: "returned" },
  { id: "bk-039", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Sipho Ndaba", checkedOutDate: "2026-01-28", returnedDate: "2026-01-30", duration: "2 days", notes: "Studio B talking head fill light", status: "returned" },
  { id: "bk-040", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Naledi Dlamini", checkedOutDate: "2025-12-17", returnedDate: "2025-12-20", duration: "3 days", notes: "Small crew travel lighting", status: "returned" },
  { id: "bk-041", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Thando Jacobs", checkedOutDate: "2025-11-06", returnedDate: "2025-11-08", duration: "2 days", notes: "Fashion set practical boost", status: "returned" },
  { id: "bk-042", equipmentId: "eq-010", equipmentName: "Aputure 300X", bookedBy: "Kagiso Molefe", checkedOutDate: "2025-09-09", returnedDate: "2025-09-11", duration: "2 days", notes: "Secondary interview light", status: "returned" },
  { id: "bk-043", equipmentId: "eq-014", equipmentName: "Rode NTG5", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-03-10", returnedDate: "2026-03-12", duration: "2 days", notes: "Voice-focused sit-down interview", status: "returned" },
  { id: "bk-044", equipmentId: "eq-014", equipmentName: "Rode NTG5", bookedBy: "Ayanda Nene", checkedOutDate: "2026-01-15", returnedDate: "2026-01-18", duration: "3 days", notes: "Short doc ambient dialogue capture", status: "returned" },
  { id: "bk-045", equipmentId: "eq-014", equipmentName: "Rode NTG5", bookedBy: "Lerato Mokoena", checkedOutDate: "2025-10-28", returnedDate: "2025-10-31", duration: "3 days", notes: "Podcast video backup boom", status: "returned" },
  { id: "bk-046", equipmentId: "eq-016", equipmentName: "Sennheiser EW 112P G4 Wireless", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-03-02", returnedDate: "2026-03-05", duration: "3 days", notes: "Presenter wireless kit", status: "returned" },
  { id: "bk-047", equipmentId: "eq-016", equipmentName: "Sennheiser EW 112P G4 Wireless", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-02-06", returnedDate: "2026-02-09", duration: "3 days", notes: "Conference panel lav setup", status: "returned" },
  { id: "bk-048", equipmentId: "eq-016", equipmentName: "Sennheiser EW 112P G4 Wireless", bookedBy: "Sipho Ndaba", checkedOutDate: "2025-12-08", returnedDate: "2025-12-10", duration: "2 days", notes: "Field presenter package", status: "returned" },
  { id: "bk-049", equipmentId: "eq-016", equipmentName: "Sennheiser EW 112P G4 Wireless", bookedBy: "Thando Jacobs", checkedOutDate: "2025-09-30", returnedDate: "2025-10-02", duration: "2 days", notes: "Run-and-gun interview audio", status: "returned" },
  { id: "bk-050", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-02-28", returnedDate: "2026-03-03", duration: "3 days", notes: "Tracking shots for showroom launch", status: "returned" },
  { id: "bk-051", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Lerato Mokoena", checkedOutDate: "2026-01-30", returnedDate: "2026-02-02", duration: "3 days", notes: "Real-estate walkthrough stabilizer", status: "returned" },
  { id: "bk-052", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Kagiso Molefe", checkedOutDate: "2025-12-12", returnedDate: "2025-12-15", duration: "3 days", notes: "Motion-heavy beauty campaign", status: "returned" },
  { id: "bk-053", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Ayanda Nene", checkedOutDate: "2025-11-18", returnedDate: "2025-11-21", duration: "3 days", notes: "Hospitality venue walkthrough", status: "returned" },
  { id: "bk-054", equipmentId: "eq-017", equipmentName: "DJI RS 3 Pro", bookedBy: "Sipho Ndaba", checkedOutDate: "2025-09-15", returnedDate: "2025-09-18", duration: "3 days", notes: "Music video motion plates", status: "returned" },
  { id: "bk-055", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Naledi Dlamini", checkedOutDate: "2026-03-08", returnedDate: "2026-03-11", duration: "3 days", notes: "Interview lock-offs", status: "returned" },
  { id: "bk-056", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-02-14", returnedDate: "2026-02-17", duration: "3 days", notes: "Long lens wildlife support", status: "returned" },
  { id: "bk-057", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Thando Jacobs", checkedOutDate: "2025-12-02", returnedDate: "2025-12-06", duration: "4 days", notes: "Studio interview tripod package", status: "returned" },
  { id: "bk-058", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Ayanda Nene", checkedOutDate: "2025-10-20", returnedDate: "2025-10-23", duration: "3 days", notes: "Conference stage camera support", status: "returned" },
  { id: "bk-059", equipmentId: "eq-019", equipmentName: "Manfrotto 504X Fluid Head Tripod", bookedBy: "Sipho Ndaba", checkedOutDate: "2025-09-04", returnedDate: "2025-09-07", duration: "3 days", notes: "Outdoor sit-down interview", status: "returned" },
  { id: "bk-060", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Lerato Mokoena", checkedOutDate: "2026-03-02", returnedDate: "2026-03-05", duration: "3 days", notes: "Director monitoring for fashion set", status: "returned" },
  { id: "bk-061", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Thabiso Mkhize", checkedOutDate: "2026-02-08", returnedDate: "2026-02-11", duration: "3 days", notes: "Wireless monitor for multicam interviews", status: "returned" },
  { id: "bk-062", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Kagiso Molefe", checkedOutDate: "2026-01-17", returnedDate: "2026-01-20", duration: "3 days", notes: "Outdoor daylight reference monitor", status: "returned" },
  { id: "bk-063", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Ayanda Nene", checkedOutDate: "2025-12-05", returnedDate: "2025-12-08", duration: "3 days", notes: "Product demo focus pulling support", status: "returned" },
  { id: "bk-064", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Sipho Ndaba", checkedOutDate: "2025-11-10", returnedDate: "2025-11-13", duration: "3 days", notes: "Lighting review monitor", status: "returned" },
  { id: "bk-065", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Naledi Dlamini", checkedOutDate: "2025-10-01", returnedDate: "2025-10-04", duration: "3 days", notes: "Travel commercial on-set monitoring", status: "returned" },
  { id: "bk-066", equipmentId: "eq-020", equipmentName: "SmallHD Cine 7", bookedBy: "Thando Jacobs", checkedOutDate: "2025-08-26", returnedDate: "2025-08-29", duration: "3 days", notes: "Music video director monitor", status: "returned" },
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
