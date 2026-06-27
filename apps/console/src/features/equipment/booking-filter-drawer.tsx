import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { bookingStatusLabel } from "@moc/types/equipment";
import type { BookingStatus } from "@moc/types/equipment";
import { RotateCcw, X } from "lucide-react";
import type { useBookingFilters } from "./use-booking-filters";

type BookingFilterDrawerProps = {
  filters: ReturnType<typeof useBookingFilters>;
};

export function BookingFilterDrawer({ filters }: BookingFilterDrawerProps) {
  const { filters: state, toggleStatus, setSort, reset, hasActiveFilters } = filters;

  const sortValue = `${state.sortField}-${state.sortDirection}`;

  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel>
        <Drawer.Header>
          <div className="flex-1">
            <Label.md>Filter & Sort</Label.md>
            <Paragraph.xs className="text-tertiary">Narrow down and order your bookings</Paragraph.xs>
          </div>
          <Drawer.Close>
            <Button.Icon variant="ghost" icon={<X />} />
          </Drawer.Close>
        </Drawer.Header>

        <Drawer.Content>
          <Tabs defaultTab="filters">
            <Tabs.List>
              <Tabs.Tab value="filters">
                <Label.sm>Filters</Label.sm>
              </Tabs.Tab>
              <Tabs.Tab value="sort">
                <Label.sm>Sort</Label.sm>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panels>
              {/* ── Filters ── */}
              <Tabs.Panel value="filters">
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Status</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {(Object.entries(bookingStatusLabel) as [BookingStatus, string][]).map(([key, label]) => (
                      <Checkbox
                        key={key}
                        checked={state.statuses.has(key)}
                        onChange={() => toggleStatus(key)}
                      >
                        <FormLabel label={label} />
                      </Checkbox>
                    ))}
                  </div>
                </div>
              </Tabs.Panel>

              {/* ── Sort ── */}
              <Tabs.Panel value="sort">
                <RadioGroup
                  value={sortValue}
                  onValueChange={(value) => {
                    const i = value.lastIndexOf("-");
                    setSort(value.slice(0, i) as Parameters<typeof setSort>[0], value.slice(i + 1) as Parameters<typeof setSort>[1]);
                  }}
                >
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Checked Out Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="checkedOutDate-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                    <Radio value="checkedOutDate-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Expected Return</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="expectedReturnAt-asc">
                      <FormLabel label="Due soon" />
                    </Radio>
                    <Radio value="expectedReturnAt-desc">
                      <FormLabel label="Due later" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Title</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="title-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="title-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Booked By</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="bookedBy-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="bookedBy-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </div>
                </div>
                </RadioGroup>
              </Tabs.Panel>
            </Tabs.Panels>
          </Tabs>
        </Drawer.Content>

        <Drawer.Footer className="*:w-full">
          {hasActiveFilters && (
            <Button variant="secondary" icon={<RotateCcw />} className="w-full" onClick={reset}>
              Reset
            </Button>
          )}
          <Drawer.Close>
            <Button className="w-full">Done</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Panel>
    </Drawer.Portal>
  );
}
