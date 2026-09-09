import { Label } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer";
import { bookingStatusLabel } from "@moc/types/equipment";
import type { BookingStatus } from "@moc/types/equipment";
import type { ChangeEvent } from "react";
import type { useBookingFilters } from "./use-booking-filters";
import { parseSortValue } from "@/utils/parse-sort-value";

type BookingFilterDrawerProps = {
  filters: ReturnType<typeof useBookingFilters>;
};

export function BookingFilterDrawer({ filters }: BookingFilterDrawerProps) {
  const { filters: state, toggleStatus, setSort, reset, hasActiveFilters } = filters;

  const sortValue = `${state.sortField}-${state.sortDirection}`;

  function handleSortChange(value: string) {
    const [field, direction] = parseSortValue(value);
    setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1]);
  }

  function handleStatusChange(event: ChangeEvent<HTMLInputElement>) {
    toggleStatus(event.target.value as BookingStatus);
  }

  return (
    <FilterDrawer hasActiveFilters={hasActiveFilters} onReset={reset}>
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
                <FilterDrawer.Group label="Status">
                  <FilterDrawer.Options>
                    {(Object.entries(bookingStatusLabel) as [BookingStatus, string][]).map(([key, label]) => (
                      <Checkbox
                        key={key}
                        checked={state.statuses.has(key)}
                        value={key}
                        onChange={handleStatusChange}
                      >
                        <FormLabel label={label} />
                      </Checkbox>
                    ))}
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
              </Tabs.Panel>

              {/* ── Sort ── */}
              <Tabs.Panel value="sort">
                <RadioGroup
                  value={sortValue}
                  onValueChange={handleSortChange}
                >
                <FilterDrawer.Group label="Checked Out Date">
                  <FilterDrawer.Options>
                    <Radio value="checkedOutDate-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                    <Radio value="checkedOutDate-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Expected Return">
                  <FilterDrawer.Options>
                    <Radio value="expectedReturnAt-asc">
                      <FormLabel label="Due soon" />
                    </Radio>
                    <Radio value="expectedReturnAt-desc">
                      <FormLabel label="Due later" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Title">
                  <FilterDrawer.Options>
                    <Radio value="title-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="title-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Booked By">
                  <FilterDrawer.Options>
                    <Radio value="bookedBy-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="bookedBy-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                </RadioGroup>
              </Tabs.Panel>
            </Tabs.Panels>
          </Tabs>
    </FilterDrawer>
  );
}
