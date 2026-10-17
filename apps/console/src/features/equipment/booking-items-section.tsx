import { Badge } from "@moc/ui/components/display/badge";
import { DividedList } from "@moc/ui/components/display/divided-list";
import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { equipmentCategoryLabel } from "@moc/types/equipment";
import type { BookingItem } from "@moc/types/equipment";
import { ChevronRight, Package } from "lucide-react";
import { Link } from "react-router-dom";

// Shared between the booking drawer and the booking detail page so the
// equipment-item list renders identically in both places. `scannedItemIds`
// reflects transient, per-session scan progress and is only supplied where a
// scan flow is active; the "Scanned" tick is not persisted state.
//
// NOTE: the design spec calls for the equipment serial number as a
// `Badge variant="outline" font-mono` trailing each row, but `BookingItem`
// (packages/types/src/equipment/booking.ts) and the API query that builds it
// (apps/api/server/platform/bookings.ts) don't carry a serial number today —
// see the audit report for the follow-up needed outside this agent's owned
// directories. The category label stands in for now.
export function BookingItemsSection({
  items,
  scannedItemIds,
  onNavigate,
}: {
  items: BookingItem[];
  scannedItemIds?: ReadonlySet<string>;
  onNavigate?: () => void;
}) {
  return (
    <section>
      <Label.sm className="block pb-3 text-primary">
        Items ({items.length})
      </Label.sm>
      {items.length === 0 ? (
        <Paragraph.sm className="text-tertiary">
          No equipment is associated with this booking.
        </Paragraph.sm>
      ) : (
        <DividedList>
          {items.map((item) => (
            <BookingItemRow
              key={item.id}
              item={item}
              isScanned={scannedItemIds?.has(item.id) ?? false}
              onNavigate={onNavigate}
            />
          ))}
        </DividedList>
      )}
    </section>
  );
}

function BookingItemRow({ item, isScanned, onNavigate }: { item: BookingItem; isScanned: boolean; onNavigate?: () => void }) {
  return (
    <InteractiveSurface.CardLink render={<Link to={`/equipment/${item.equipmentId}`} onClick={onNavigate} />} aria-label={item.equipmentName}>
      <ListItemCard.Root>
        <ListItemCard.Leading>
          {item.equipmentThumbnail ? <img src={item.equipmentThumbnail} alt="" className="size-full object-cover" /> : <Package />}
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{item.equipmentName}</ListItemCard.Title>
          <ListItemCard.Subtitle>{equipmentCategoryLabel[item.equipmentCategory]}</ListItemCard.Subtitle>
        </ListItemCard.Content>
        <ListItemCard.Trailing>
          {isScanned && <Badge color="green" label="Scanned" />}
          <ChevronRight className="size-4 shrink-0 text-quaternary" aria-hidden="true" />
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    </InteractiveSurface.CardLink>
  );
}
