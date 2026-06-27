import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { equipmentCategoryLabel, equipmentStatusLabel } from "@moc/types/equipment";
import type { EquipmentCategory } from "@moc/types/equipment/category";
import type { EquipmentStatus } from "@moc/types/equipment/status";
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
                <RadioGroup
                  value={sortValue}
                  onValueChange={(value) => {
                    const i = value.lastIndexOf("-");
                    setSort(value.slice(0, i) as Parameters<typeof setSort>[0], value.slice(i + 1) as Parameters<typeof setSort>[1]);
                  }}
                >
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="name-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="name-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Last Active</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="lastActiveDate-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio value="lastActiveDate-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Category</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="category-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="category-desc">
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
