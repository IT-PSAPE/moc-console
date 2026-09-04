import { applyCors } from "../../server/cors.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { handlePublicNotificationWake, type PublicNotificationWakeOptions } from "../../server/notifications/public-wake.js"
import { observeApiRequest } from "../../server/observability.js"
import { routeParameterValue } from "../../server/route-dispatch.js"

type PublicWakeRoute = {
  observationRoute: string
  options: PublicNotificationWakeOptions
}

const routes: Readonly<Record<string, PublicWakeRoute>> = {
  booking: {
    observationRoute: "notify.booking",
    options: {
      entityIdField: "booking_id",
      entityType: "booking",
      eventType: "booking.created",
      notFoundMessage: "Booking not found",
    },
  },
  request: {
    observationRoute: "notify.request",
    options: {
      entityIdField: "request_id",
      entityType: "request",
      eventType: "request.created",
      notFoundMessage: "Request not found",
    },
  },
  "venue-booking": {
    observationRoute: "notify.venue-booking",
    options: {
      entityIdField: "venue_booking_id",
      entityType: "venue_booking",
      eventType: "venue_booking.created",
      notFoundMessage: "Venue booking not found",
    },
  },
}

async function handleWake(request: ApiRequest, response: ApiResponse, options: PublicNotificationWakeOptions): Promise<void> {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")
  await handlePublicNotificationWake(request, response, options)
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  const kind = routeParameterValue(request, "kind")
  const route = kind ? routes[kind] : undefined
  if (!route) {
    response.status(404).json({ error: "Not found" })
    return
  }

  await observeApiRequest(route.observationRoute, request, response, async () => {
    await handleWake(request, response, route.options)
  })
}
