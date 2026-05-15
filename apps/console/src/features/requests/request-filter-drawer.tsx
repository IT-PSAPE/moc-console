import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Input } from "@moc/ui/components/form/input";
import { Radio } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { categoryLabel, priorityLabel } from "@moc/types/requests";
import type { Category } from "@moc/types/requests/category";
import type { Priority } from "@moc/types/requests/priority";
import { RotateCcw, X } from "lucide-react";
import type { useRequestFilters } from "./use-request-filters";

type RequestFilterDrawerProps = {
    filters: ReturnType<typeof useRequestFilters>;
};

export function RequestFilterDrawer({ filters }: RequestFilterDrawerProps) {
    const { filters: state, toggleCategory, togglePriority, setDateRange, setSort, reset, hasActiveFilters } = filters;

    const sortValue = `${state.sortField}-${state.sortDirection}`;

    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <Drawer.Header>
                    <div className="flex-1">
                        <Label.md>Filter & Sort</Label.md>
                        <Paragraph.xs className="text-tertiary">Narrow down and order your requests</Paragraph.xs>
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
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Type</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        {(Object.entries(categoryLabel) as [Category, string][]).map(([key, label]) => (
                                            <Checkbox
                                                key={key}
                                                checked={state.categories.has(key)}
                                                onChange={() => toggleCategory(key)}
                                            >
                                                <FormLabel label={label} />
                                            </Checkbox>
                                        ))}
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Priority</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        {(Object.entries(priorityLabel) as [Priority, string][]).map(([key, label]) => (
                                            <Checkbox
                                                key={key}
                                                checked={state.priorities.has(key)}
                                                onChange={() => togglePriority(key)}
                                            >
                                                <FormLabel label={label} />
                                            </Checkbox>
                                        ))}
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline</Paragraph.sm>
                                    <div className="flex gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Start Date" />
                                            <Input
                                                type="date"
                                                value={state.dateRange.start}
                                                onChange={(e) => setDateRange(e.target.value, state.dateRange.end)}
                                            />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="End Date" />
                                            <Input
                                                type="date"
                                                value={state.dateRange.end}
                                                onChange={(e) => setDateRange(state.dateRange.start, e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </Tabs.Panel>

                            {/* ── Sort ── */}
                            <Tabs.Panel value="sort">
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="sort" value="title-asc" checked={sortValue === "title-asc"} onChange={() => setSort("title", "asc")}>
                                            <FormLabel label="A-Z" />
                                        </Radio>
                                        <Radio name="sort" value="title-desc" checked={sortValue === "title-desc"} onChange={() => setSort("title", "desc")}>
                                            <FormLabel label="Z-A" />
                                        </Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Due date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="sort" value="dueDate-asc" checked={sortValue === "dueDate-asc"} onChange={() => setSort("dueDate", "asc")}>
                                            <FormLabel label="Ascending" />
                                        </Radio>
                                        <Radio name="sort" value="dueDate-desc" checked={sortValue === "dueDate-desc"} onChange={() => setSort("dueDate", "desc")}>
                                            <FormLabel label="Descending" />
                                        </Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Created date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="sort" value="createdAt-asc" checked={sortValue === "createdAt-asc"} onChange={() => setSort("createdAt", "asc")}>
                                            <FormLabel label="Ascending" />
                                        </Radio>
                                        <Radio name="sort" value="createdAt-desc" checked={sortValue === "createdAt-desc"} onChange={() => setSort("createdAt", "desc")}>
                                            <FormLabel label="Descending" />
                                        </Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Type</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="sort" value="category-asc" checked={sortValue === "category-asc"} onChange={() => setSort("category", "asc")}>
                                            <FormLabel label="A-Z" />
                                        </Radio>
                                        <Radio name="sort" value="category-desc" checked={sortValue === "category-desc"} onChange={() => setSort("category", "desc")}>
                                            <FormLabel label="Z-A" />
                                        </Radio>
                                    </div>
                                </div>
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
