import { Button } from "@/components/controls/button";
import { Divider } from "@/components/display/divider";
import { Label, Paragraph } from "@/components/display/text";
import { Checkbox } from "@/components/form/checkbox";
import { FormLabel } from "@/components/form/form-label";
import { Radio } from "@/components/form/radio";
import { Tabs } from "@/components/layout/tabs";
import { Drawer } from "@/components/overlays/drawer";
import { equipmentCategoryLabel, equipmentStatusLabel } from "@/types/equipment";
import type { EquipmentCategory } from "@/types/equipment/category";
import type { EquipmentStatus } from "@/types/equipment/status";
import { RotateCcw, X } from "lucide-react";
import type { useEquipmentFilters } from "./use-equipment-filters";

type EquipmentFilterDrawerProps = {
  filters: ReturnType<typeof useEquipmentFilters>;
};

export function EquipmentFilterDrawer({ filters }: EquipmentFilterDrawerProps) {
  const { filters: state, toggleCategory, toggleStatus, setSort, reset, hasActiveFilters } = filters;

  const sortValue = `${state.sortField}-${state.sortDirection}`;

  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel>
        <Drawer.Header>
          <div className="flex-1">
            <Label.md>Filter & Sort</Label.md>
            <Paragraph.xs className="text-tertiary">Narrow down and order your equipment</Paragraph.xs>
          </div>
          <Drawer.Close>
            <Button variant="ghost" icon={<X />} iconOnly />
          </Drawer.Close>
        </Drawer.Header>

        <Drawer.Content>
          <Tabs.Root defaultTab="filters">
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
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Category</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {(Object.entries(equipmentCategoryLabel) as [EquipmentCategory, string][]).map(([key, label]) => (
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
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Status</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {(Object.entries(equipmentStatusLabel) as [EquipmentStatus, string][]).map(([key, label]) => (
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
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="sort" value="name-asc" checked={sortValue === "name-asc"} onChange={() => setSort("name", "asc")}>
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio name="sort" value="name-desc" checked={sortValue === "name-desc"} onChange={() => setSort("name", "desc")}>
                      <FormLabel label="Z-A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Last Active</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="sort" value="lastActiveDate-asc" checked={sortValue === "lastActiveDate-asc"} onChange={() => setSort("lastActiveDate", "asc")}>
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio name="sort" value="lastActiveDate-desc" checked={sortValue === "lastActiveDate-desc"} onChange={() => setSort("lastActiveDate", "desc")}>
                      <FormLabel label="Newest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Category</Paragraph.sm>
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
          </Tabs.Root>
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
