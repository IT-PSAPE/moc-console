import type { ChangeEvent } from "react";
import { Label } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Input } from "@moc/ui/components/form/input";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer";
import type { VenueBookingPhase } from "@moc/types/venues";
import { venueBookingPhaseGroups } from "@moc/types/venues";
import { parseSortValue } from "@/utils/parse-sort-value";
import type { useVenueBookingFilters } from "./use-venue-booking-filters";

type VenueBookingFilterDrawerProps = {
    filters: ReturnType<typeof useVenueBookingFilters>;
};

export function VenueBookingFilterDrawer({ filters }: VenueBookingFilterDrawerProps) {
    const { filters: state, togglePhase, setDateRange, setSort, reset, hasActiveFilters } = filters;

    const sortValue = `${state.sortField}-${state.sortDirection}`;

    function handleSortChange(value: string) {
        const [field, direction] = parseSortValue(value);
        setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1]);
    }

    function handlePhaseChange(event: ChangeEvent<HTMLInputElement>) {
        togglePhase(event.target.value as VenueBookingPhase);
    }

    function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
        setDateRange(event.target.value, state.dateRange.end);
    }

    function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
        setDateRange(state.dateRange.start, event.target.value);
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
                                {venueBookingPhaseGroups.map((group) => (
                                    <Checkbox
                                        key={group.key}
                                        checked={state.phases.has(group.key)}
                                        value={group.key}
                                        onChange={handlePhaseChange}
                                    >
                                        <FormLabel label={group.label} />
                                    </Checkbox>
                                ))}
                            </FilterDrawer.Options>
                        </FilterDrawer.Group>
                        <FilterDrawer.Group label="Timeline">
                            <FilterDrawer.Options>
                                <label className="space-y-1 *:odd:ml-1">
                                    <FormLabel label="Start Date" />
                                    <Input
                                        aria-label="Booking timeline start date"
                                        name="venue-booking-timeline-start"
                                        type="date"
                                        value={state.dateRange.start}
                                        onChange={handleStartDateChange}
                                    />
                                </label>
                                <label className="space-y-1 *:odd:ml-1">
                                    <FormLabel label="End Date" />
                                    <Input
                                        aria-label="Booking timeline end date"
                                        name="venue-booking-timeline-end"
                                        type="date"
                                        value={state.dateRange.end}
                                        onChange={handleEndDateChange}
                                    />
                                </label>
                            </FilterDrawer.Options>
                        </FilterDrawer.Group>
                    </Tabs.Panel>

                    {/* ── Sort ── */}
                    <Tabs.Panel value="sort">
                        <RadioGroup
                            value={sortValue}
                            onValueChange={handleSortChange}
                        >
                            <FilterDrawer.Group label="Booking time">
                                <FilterDrawer.Options>
                                    <Radio value="startsAt-asc">
                                        <FormLabel label="Earliest first" />
                                    </Radio>
                                    <Radio value="startsAt-desc">
                                        <FormLabel label="Latest first" />
                                    </Radio>
                                </FilterDrawer.Options>
                            </FilterDrawer.Group>
                            <FilterDrawer.Group label="Venue">
                                <FilterDrawer.Options>
                                    <Radio value="venueName-asc">
                                        <FormLabel label="A-Z" />
                                    </Radio>
                                    <Radio value="venueName-desc">
                                        <FormLabel label="Z-A" />
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
                            <FilterDrawer.Group label="Created date">
                                <FilterDrawer.Options>
                                    <Radio value="createdAt-asc">
                                        <FormLabel label="Ascending" />
                                    </Radio>
                                    <Radio value="createdAt-desc">
                                        <FormLabel label="Descending" />
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
