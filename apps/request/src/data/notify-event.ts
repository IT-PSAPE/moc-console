import { apiUrl } from "@moc/utils/api-url"

type NotificationWake = {
  endpoint: string
  body: Record<string, string>
}

function wakeNotification({ endpoint, body }: NotificationWake): void {
  void fetch(apiUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined)
}

export function wakeRequestCreatedNotification(requestId: string, trackingCode: string): void {
  wakeNotification({
    endpoint: "/api/notify/request",
    body: { request_id: requestId, tracking_code: trackingCode },
  })
}

export function wakeBookingCreatedNotification(bookingId: string, trackingCode: string): void {
  wakeNotification({
    endpoint: "/api/notify/booking",
    body: { booking_id: bookingId, tracking_code: trackingCode },
  })
}

export function wakeVenueBookingCreatedNotification(venueBookingId: string, trackingCode: string): void {
  wakeNotification({
    endpoint: "/api/notify/venue-booking",
    body: { venue_booking_id: venueBookingId, tracking_code: trackingCode },
  })
}
