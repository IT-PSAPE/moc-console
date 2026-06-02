import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { equipmentCategoryLabel } from "@moc/types/equipment";
import type { BookingItem } from "@moc/types/equipment";
import { ChevronRight, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Shared between the booking drawer and the booking detail page so the
// equipment-item list renders identically in both places. `scannedItemIds`
// reflects transient, per-session scan progress and is only supplied where a
// scan flow is active; the "Scanned" tick is not persisted state.
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
    <section className="mt-6 px-4">
      <Label.xs className="uppercase tracking-wide text-quaternary">
        Items ({items.length})
      </Label.xs>
      <div className="mt-2 border-t border-border-secondary">
        {items.length === 0 && (
          <Paragraph.sm className="py-3 text-tertiary">
            No equipment is associated with this booking.
          </Paragraph.sm>
        )}
        {items.map((item) => (
          <BookingItemRow
            key={item.id}
            item={item}
            isScanned={scannedItemIds?.has(item.id) ?? false}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}

function BookingItemRow({ item, isScanned, onNavigate }: { item: BookingItem; isScanned: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();

  function handleClick() {
    onNavigate?.();
    navigate(`/equipment/${item.equipmentId}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-3 py-3 border-b border-border-secondary text-left hover:bg-background-primary-hover transition-colors"
    >
      {item.equipmentThumbnail ? (
        <img src={item.equipmentThumbnail} alt={item.equipmentName} className="size-10 rounded object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-secondary text-quaternary">
          <Package className="size-5" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <Label.sm className="block truncate">{item.equipmentName}</Label.sm>
        <Paragraph.xs className="text-tertiary">
          {equipmentCategoryLabel[item.equipmentCategory]}
        </Paragraph.xs>
      </div>
      {isScanned ? <Badge color="green" label="Scanned" /> : null}
      <ChevronRight className="size-4 text-quaternary" />
    </button>
  );
}
