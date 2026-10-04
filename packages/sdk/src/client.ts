import { createAuthClient } from "./auth"
import { createBookingsClient } from "./bookings"
import { createBroadcastsClient } from "./broadcasts"
import { createChecklistsClient } from "./checklists"
import { createEquipmentClient } from "./equipment"
import { createIntegrationsClient } from "./integrations"
import { createNotificationSettingsClient } from "./notification-settings"
import { createNotificationsClient } from "./notifications"
import { createPublicSubmissionsClient } from "./public-submissions"
import { createRequestsClient } from "./requests"
import { createStorageClient } from "./storage"
import { createStreamsClient } from "./streams"
import { createTelegramClient } from "./telegram"
import { createTelegramMiniAppClient } from "./telegram-mini-app"
import { createMocTransport, type MocTransportOptions } from "./transport"
import { createUsersClient } from "./users"
import { createVenueBookingsClient } from "./venue-bookings"
import { createVenuesClient } from "./venues"
import { createWorkspacesClient } from "./workspaces"

export function createMocClient(baseUrl: string, options: MocTransportOptions = {}) {
  const transport = createMocTransport(baseUrl, options)
  return {
    auth: createAuthClient(transport),
    bookings: createBookingsClient(transport),
    broadcasts: createBroadcastsClient(transport),
    checklists: createChecklistsClient(transport),
    equipment: createEquipmentClient(transport),
    integrations: createIntegrationsClient(transport),
    notificationSettings: createNotificationSettingsClient(transport),
    notifications: createNotificationsClient(transport),
    publicSubmissions: createPublicSubmissionsClient(transport),
    requests: createRequestsClient(transport),
    storage: createStorageClient(transport),
    streams: createStreamsClient(transport),
    telegram: createTelegramClient(transport),
    telegramMiniApp: createTelegramMiniAppClient(transport),
    users: createUsersClient(transport),
    venueBookings: createVenueBookingsClient(transport),
    venues: createVenuesClient(transport),
    workspaces: createWorkspacesClient(transport),
  }
}

export type MocClient = ReturnType<typeof createMocClient>
