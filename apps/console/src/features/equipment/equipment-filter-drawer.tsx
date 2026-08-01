import { Label } from "@moc/ui/components/display/text";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer";
import { equipmentCategoryLabel, equipmentStatusLabel } from "@moc/types/equipment";
import type { EquipmentCategory } from "@moc/types/equipment/category";
import type { EquipmentStatus } from "@moc/types/equipment/status";
import type { ChangeEvent } from "react";
import type { useEquipmentFilters } from "./use-equipment-filters";
import { parseSortValue } from "@/utils/parse-sort-value";

type EquipmentFilterDrawerProps = {
  filters: ReturnType<typeof useEquipmentFilters>;
};

export function EquipmentFilterDrawer({ filters }: EquipmentFilterDrawerProps) {
  const { filters: state, toggleCategory, toggleStatus, setSort, reset, hasActiveFilters } = filters;

  const sortValue = `${state.sortField}-${state.sortDirection}`;

  function handleSortChange(value: string) {
    const [field, direction] = parseSortValue(value);
    setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1]);
  }

  function handleCategoryChange(event: ChangeEvent<HTMLInputElement>) {
    toggleCategory(event.target.value as EquipmentCategory);
  }

  function handleStatusChange(event: ChangeEvent<HTMLInputElement>) {
    toggleStatus(event.target.value as EquipmentStatus);
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
                <FilterDrawer.Group label="Category">
                  <FilterDrawer.Options>
                    {(Object.entries(equipmentCategoryLabel) as [EquipmentCategory, string][]).map(([key, label]) => (
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
                  <FilterDrawer.Options>
                    {(Object.entries(equipmentStatusLabel) as [EquipmentStatus, string][]).map(([key, label]) => (
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
                <FilterDrawer.Group label="Name">
                  <FilterDrawer.Options>
                    <Radio value="name-asc">
                      <FormLabel label="A-Z" />
                    </Radio>
                    <Radio value="name-desc">
                      <FormLabel label="Z-A" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Last Active">
                  <FilterDrawer.Options>
                    <Radio value="lastActiveDate-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio value="lastActiveDate-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Category">
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
