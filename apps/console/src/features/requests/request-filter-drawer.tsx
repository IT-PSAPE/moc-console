import { Label } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Input } from "@moc/ui/components/form/input";
import { ManagedOptionPicker } from "@moc/ui/components/form/managed-option-picker";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Select } from "@moc/ui/components/form/select";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer";
import { priorityLabel, statusLabel, type RequestCategoryDefinition } from "@moc/types/requests";
import type { Priority } from "@moc/types/requests/priority";
import type { Status } from "@moc/types/requests/status";
import type { ChangeEvent } from "react";
import { hasRequestResettableState, type useRequestFilters } from "./use-request-filters";
import { parseSortValue } from "@/utils/parse-sort-value";
import { useRequests } from "./request-provider";
import { useWorkspace } from "@/lib/workspace-context";
import type { RequestWorkView } from "./request-work-view";

const requestWorkViews: { value: RequestWorkView; label: string }[] = [
    { value: "all", label: "All requests" },
    { value: "assigned", label: "Assigned to me" },
    { value: "due-soon", label: "Due soon" },
    { value: "attention", label: "Needs attention" },
];

type RequestFilterDrawerProps = {
    filters: ReturnType<typeof useRequestFilters>;
    workView: RequestWorkView;
    onWorkViewChange: (value: string) => void;
    onReset: () => void;
};

function getRequestTypeKey(category: RequestCategoryDefinition): string { return category.key; }
function getRequestTypeLabel(category: RequestCategoryDefinition): string { return category.name; }
function getRequestTypeActive(category: RequestCategoryDefinition): boolean { return category.active; }

export function RequestFilterDrawer({ filters, workView, onWorkViewChange, onReset }: RequestFilterDrawerProps) {
    const { filters: state, togglePriority, toggleStatus, setDateRange, setSort, hasActiveFilters } = filters;
    const { role, currentWorkspaceId } = useWorkspace();
    const { state: requestState, actions: requestActions } = useRequests();
    const canManageTypes = role?.can_manage_roles === true;
    const onCreateType = canManageTypes ? requestActions.createRequestType : undefined;
    const onRenameType = canManageTypes ? requestActions.renameRequestType : undefined;
    const onTypeActiveChange = canManageTypes ? requestActions.setRequestTypeActive : undefined;
    const drawerHasActiveFilters = hasRequestResettableState(filters.filters, hasActiveFilters, workView);

    const sortValue = `${state.sortField}-${state.sortDirection}`;

    function handleTypeChange(category: RequestCategoryDefinition | null) {
        filters.setCategory(category?.key ?? null);
    }

    function handleWorkViewChange(value: string | null) {
        if (value && requestWorkViews.some((option) => option.value === value)) onWorkViewChange(value);
    }

    function handleSortChange(value: string) {
        const [field, direction] = parseSortValue(value);
        setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1]);
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

    function renderWorkView(option: (typeof requestWorkViews)[number]) {
        return <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>;
    }

    return (
        <FilterDrawer hasActiveFilters={drawerHasActiveFilters} onReset={onReset}>
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
                            <FilterDrawer.Group label="View">
                                <Select.Root items={requestWorkViews} value={workView} onValueChange={handleWorkViewChange}>
                                    <Select.Trigger aria-label="Request work view" className="w-full" />
                                    <Select.Content>{requestWorkViews.map(renderWorkView)}</Select.Content>
                                </Select.Root>
                            </FilterDrawer.Group>
                            <FilterDrawer.Group label="Type">
                                <ManagedOptionPicker.Root key={currentWorkspaceId ?? "none"} options={requestState.requestCategories} value={state.category} onValueChange={handleTypeChange} getOptionKey={getRequestTypeKey} getOptionLabel={getRequestTypeLabel} getOptionActive={getRequestTypeActive} onCreate={onCreateType} onRename={onRenameType} onActiveChange={onTypeActiveChange} label="Type" placeholder="Filter by type">
                                    <ManagedOptionPicker.Field className="w-full" />
                                    <ManagedOptionPicker.Content />
                                </ManagedOptionPicker.Root>
                            </FilterDrawer.Group>
                            <FilterDrawer.Group label="Status">
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
