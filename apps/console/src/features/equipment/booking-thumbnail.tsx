import { Package } from "lucide-react";

// Header icon tile for a booking record — shared between the booking drawer
// and the booking detail page so the two headers render identically.
export function BookingThumbnail() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-secondary bg-secondary text-quaternary">
      <Package className="size-5" />
    </span>
  );
}
