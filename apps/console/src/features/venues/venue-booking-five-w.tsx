import { Label } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { cn } from "@moc/utils/cn";
import { FiveWRow } from "@/features/requests/five-w-row";

export function VenueBookingFiveW({ booking, className }: { booking: VenueBooking; className?: string }) {
  return (
    <div className={cn(className)}>
      <Label.md className="block pb-3">5Ws and 1H</Label.md>
      <div className="space-y-3">
        <FiveWRow label="Who" value={booking.who} /><FiveWRow label="What" value={booking.what} /><FiveWRow label="When" value={booking.when} />
        <FiveWRow label="Where" value={booking.where} /><FiveWRow label="Why" value={booking.why} /><FiveWRow label="How" value={booking.how} />
      </div>
    </div>
  );
}
