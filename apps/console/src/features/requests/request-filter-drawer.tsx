import { Label } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Input } from "@moc/ui/components/form/input";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer";
import { categoryLabel, priorityLabel, statusLabel } from "@moc/types/requests";
import type { Category } from "@moc/types/requests/category";
import type { Priority } from "@moc/types/requests/priority";
import type { Status } from "@moc/types/requests/status";
import type { ChangeEvent } from "react";
import type { useRequestFilters } from "./use-request-filters";
import { parseSortValue } from "@/utils/parse-sort-value";

type RequestFilterDrawerProps = {
    filters: ReturnType<typeof useRequestFilters>;
};

export function RequestFilterDrawer({ filters }: RequestFilterDrawerProps) {
    const { filters: state, toggleCategory, togglePriority, toggleStatus, setDateRange, setSort, reset, hasActiveFilters } = filters;

    const sortValue = `${state.sortField}-${state.sortDirection}`;

    function handleSortChange(value: string) {
        const [field, direction] = parseSortValue(value);
        setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1]);
    }

    function handleCategoryChange(event: ChangeEvent<HTMLInputElement>) {
        toggleCategory(event.target.value as Category);
    }

    function handleStatusChange(event: ChangeEvent<HTMLInputElement>) {
        toggleStatus(event.target.value as Status);
    }

    function handlePriorityChange(event: ChangeEvent<HTMLInputElement>) {
        togglePriority(event.target.value as Priority);
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
                                <FilterDrawer.Group label="Type">
                                    <FilterDrawer.Options>
                                        {(Object.entries(categoryLabel) as [Category, string][]).map(([key, label]) => (
                                            <Checkbox
                                                key={key}
                                                checked={state.categories.has(key)}
                                                value={key}
                                                onChange={handleCategoryChange}
                                            >
                                                <FormLabel label={label} />
                                            </Checkbox>
                                        ))}
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Status">
                                    {/* Archived requests are excluded from the
                                        default view; tick Archived to see them. */}
                                    <FilterDrawer.Options>
                                        {(Object.entries(statusLabel) as [Status, string][]).map(([key, label]) => (
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
                                <FilterDrawer.Group label="Priority">
                                    <FilterDrawer.Options>
                                        {(Object.entries(priorityLabel) as [Priority, string][]).map(([key, label]) => (
                                            <Checkbox
                                                key={key}
                                                checked={state.priorities.has(key)}
                                                value={key}
                                                onChange={handlePriorityChange}
                                            >
                                                <FormLabel label={label} />
                                            </Checkbox>
                                        ))}
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Timeline">
                                    <FilterDrawer.Options>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Start Date" />
                                            <Input
                                                aria-label="Request timeline start date"
                                                name="request-timeline-start"
                                                type="date"
                                                value={state.dateRange.start}
                                                onChange={handleStartDateChange}
                                            />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="End Date" />
                                            <Input
                                                aria-label="Request timeline end date"
                                                name="request-timeline-end"
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
                                <FilterDrawer.Group label="Name">
                                    <FilterDrawer.Options>
                                        <Radio value="title-asc">
                                            <FormLabel label="A-Z" />
                                        </Radio>
                                        <Radio value="title-desc">
                                            <FormLabel label="Z-A" />
                                        </Radio>
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Due date">
                                    <FilterDrawer.Options>
                                        <Radio value="dueDate-asc">
                                            <FormLabel label="Ascending" />
                                        </Radio>
                                        <Radio value="dueDate-desc">
                                            <FormLabel label="Descending" />
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
                                <FilterDrawer.Group label="Type">
                                    <FilterDrawer.Options>
                                        <Radio value="category-asc">
                                            <FormLabel label="A-Z" />
                                        </Radio>
                                        <Radio value="category-desc">
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
