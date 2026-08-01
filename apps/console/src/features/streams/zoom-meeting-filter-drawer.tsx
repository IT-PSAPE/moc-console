import { Label } from "@moc/ui/components/display/text"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { Tabs } from "@moc/ui/components/layout/tabs"
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import type { ZoomRecurrenceType } from "@moc/types/streams/zoom"
import type { ChangeEvent } from "react"
import type { useZoomMeetingFilters } from "./use-zoom-meeting-filters"
import { parseSortValue } from "@/utils/parse-sort-value"

type ZoomMeetingFilterDrawerProps = {
  filters: ReturnType<typeof useZoomMeetingFilters>
}

const recurrenceTypes: ZoomRecurrenceType[] = ["none", "daily", "weekly", "monthly"]

export function ZoomMeetingFilterDrawer({ filters }: ZoomMeetingFilterDrawerProps) {
  const {
    filters: state,
    toggleRecurrenceType,
    setDateRange,
    setShowPast,
    setSort,
    reset,
    hasActiveFilters,
  } = filters

  const sortValue = `${state.sortField}-${state.sortDirection}`

  function handleSortChange(value: string) {
    const [field, direction] = parseSortValue(value)
    setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1])
  }

  function handleRecurrenceChange(event: ChangeEvent<HTMLInputElement>) {
    toggleRecurrenceType(event.target.value as ZoomRecurrenceType)
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setDateRange(event.target.value, state.dateRange.end)
  }

  function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
    setDateRange(state.dateRange.start, event.target.value)
  }

  function handleShowPastChange(event: ChangeEvent<HTMLInputElement>) {
    setShowPast(event.target.checked)
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
                <FilterDrawer.Group label="Recurrence">
                  <FilterDrawer.Options>
                    {recurrenceTypes.map((type) => (
                      <Checkbox
                        key={type}
                        checked={state.recurrenceTypes.has(type)}
                        value={type}
                        onChange={handleRecurrenceChange}
                      >
                        <FormLabel label={zoomRecurrenceLabel[type]} />
                      </Checkbox>
                    ))}
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Start Date">
                  <FilterDrawer.Options>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="From" />
                      <Input
                        aria-label="Meeting start date from"
                        name="meeting-start-from"
                        type="date"
                        value={state.dateRange.start}
                        onChange={handleStartDateChange}
                      />
                    </label>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="To" />
                      <Input
                        aria-label="Meeting start date to"
                        name="meeting-start-to"
                        type="date"
                        value={state.dateRange.end}
                        onChange={handleEndDateChange}
                      />
                    </label>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Past Meetings">
                  <div>
                    <Checkbox
                      checked={state.showPast}
                      onChange={handleShowPastChange}
                    >
                      <FormLabel label="Show past one-time meetings" />
                    </Checkbox>
                  </div>
                </FilterDrawer.Group>
              </Tabs.Panel>

              {/* ── Sort ── */}
              <Tabs.Panel value="sort">
                <RadioGroup
                  value={sortValue}
                  onValueChange={handleSortChange}
                >
                <FilterDrawer.Group label="Topic">
                  <FilterDrawer.Options>
                    <Radio value="topic-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="topic-desc">
                      <FormLabel label="Z–A" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Start Time">
                  <FilterDrawer.Options>
                    <Radio value="startTime-asc">
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio value="startTime-desc">
                      <FormLabel label="Latest first" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Duration">
                  <FilterDrawer.Options>
                    <Radio value="duration-asc">
                      <FormLabel label="Shortest first" />
                    </Radio>
                    <Radio value="duration-desc">
                      <FormLabel label="Longest first" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Created Date">
                  <FilterDrawer.Options>
                    <Radio value="createdAt-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio value="createdAt-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                </RadioGroup>
              </Tabs.Panel>
            </Tabs.Panels>
          </Tabs>
    </FilterDrawer>
  )
}
