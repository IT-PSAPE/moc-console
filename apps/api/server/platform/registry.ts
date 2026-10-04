import type { PlatformRegistry } from "./handler.js"
import { operations as capability0 } from "./bookings.js"
import { operations as capability1 } from "./broadcasts.js"
import { operations as capability2 } from "./checklists.js"
import { operations as capability3 } from "./equipment.js"
import { operations as capability4 } from "./notification-settings.js"
import { operations as capability5 } from "./public.js"
import { operations as capability6 } from "./requests.js"
import { operations as capability7 } from "./streams.js"
import { operations as capability8 } from "./telegram.js"
import { operations as capability9 } from "./users.js"
import { operations as capability10 } from "./venue-bookings.js"
import { operations as capability11 } from "./venues.js"
import { operations as capability12 } from "./workspaces.js"

export const platformRegistry: PlatformRegistry = {
  "bookings": capability0,
  "broadcasts": capability1,
  "checklists": capability2,
  "equipment": capability3,
  "notification-settings": capability4,
  "publicSubmissions": capability5,
  "requests": capability6,
  "streams": capability7,
  "telegram": capability8,
  "users": capability9,
  "venueBookings": capability10,
  "venues": capability11,
  "workspaces": capability12,
}
