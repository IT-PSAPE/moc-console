import type { ApiRequest, ApiResponse } from "../../http.js"
import { routeParameterSegments, type ApiHandler } from "../../route-dispatch.js"
import assignment from "./assignment.js"
import bookings from "./bookings.js"
import internal from "./internal.js"
import requests from "./requests.js"

export type NotificationRouteDependencies = {
  assignment: ApiHandler
  bookings: ApiHandler
  internal: ApiHandler
  requests: ApiHandler
}

const productionDependencies: NotificationRouteDependencies = { assignment, bookings, internal, requests }

export function createNotificationRouter(dependencies: NotificationRouteDependencies = productionDependencies): ApiHandler {
  return async function notificationRouter(request: ApiRequest, response: ApiResponse): Promise<void> {
    const [route, event] = routeParameterSegments(request, "path")
    if (route === "internal" && event) {
      request.query = { ...request.query, event }
      await dependencies.internal(request, response)
      return
    }

    const handler = route === "assignment" ? dependencies.assignment
      : route === "bookings" ? dependencies.bookings
        : route === "requests" ? dependencies.requests
          : undefined
    if (!handler) {
      response.status(404).json({ error: "Not found" })
      return
    }
    await handler(request, response)
  }
}

export default createNotificationRouter()
