import { Label } from "@moc/ui/components/display/text"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { Tabs } from "@moc/ui/components/layout/tabs"
import { FilterDrawer } from "@moc/ui/components/overlays/filter-drawer"
import { streamStatusLabel, streamPrivacyLabel } from "@moc/types/streams/stream-constants"
import type { StreamStatus, StreamPrivacy } from "@moc/types/streams/stream"
import type { ChangeEvent } from "react"
import type { useStreamFilters } from "./use-stream-filters"
import { parseSortValue } from "@/utils/parse-sort-value"

type StreamFilterDrawerProps = {
  filters: ReturnType<typeof useStreamFilters>
}

const statuses: StreamStatus[] = ["created", "ready", "live"]
const privacies: StreamPrivacy[] = ["public", "private", "unlisted"]

export function StreamFilterDrawer({ filters }: StreamFilterDrawerProps) {
  const {
    filters: state,
    toggleStatus,
    togglePrivacy,
    setScheduledDateRange,
    setShowCompleted,
    setSort,
    reset,
    hasActiveFilters,
  } = filters

  const sortValue = `${state.sortField}-${state.sortDirection}`

  function handleSortChange(value: string) {
    const [field, direction] = parseSortValue(value)
    setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1])
  }

  function handleStatusChange(event: ChangeEvent<HTMLInputElement>) {
    toggleStatus(event.target.value as StreamStatus)
  }

  function handlePrivacyChange(event: ChangeEvent<HTMLInputElement>) {
    togglePrivacy(event.target.value as StreamPrivacy)
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setScheduledDateRange(event.target.value, state.scheduledDateRange.end)
  }

  function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
    setScheduledDateRange(state.scheduledDateRange.start, event.target.value)
  }

  function handleShowCompletedChange(event: ChangeEvent<HTMLInputElement>) {
    setShowCompleted(event.target.checked)
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
                    {statuses.map((status) => (
                      <Checkbox
                        key={status}
                        checked={state.statuses.has(status)}
                        value={status}
                        onChange={handleStatusChange}
                      >
                        <FormLabel label={streamStatusLabel[status]} />
                      </Checkbox>
                    ))}
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Visibility">
                  <FilterDrawer.Options>
                    {privacies.map((privacy) => (
                      <Checkbox
                        key={privacy}
                        checked={state.privacies.has(privacy)}
                        value={privacy}
                        onChange={handlePrivacyChange}
                      >
                        <FormLabel label={streamPrivacyLabel[privacy]} />
                      </Checkbox>
                    ))}
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Scheduled Date">
                  <FilterDrawer.Options>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="From" />
                      <Input
                        aria-label="Scheduled from date"
                        name="stream-scheduled-from"
                        type="date"
                        value={state.scheduledDateRange.start}
                        onChange={handleStartDateChange}
                      />
                    </label>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="To" />
                      <Input
                        aria-label="Scheduled to date"
                        name="stream-scheduled-to"
                        type="date"
                        value={state.scheduledDateRange.end}
                        onChange={handleEndDateChange}
                      />
                    </label>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Completed Streams">
                  <div>
                    <Checkbox
                      checked={state.showCompleted}
                      onChange={handleShowCompletedChange}
                    >
                      <FormLabel label="Show completed streams" />
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
                <FilterDrawer.Group label="Title">
                  <FilterDrawer.Options>
                    <Radio value="title-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="title-desc">
                      <FormLabel label="Z–A" />
                    </Radio>
                  </FilterDrawer.Options>
                </FilterDrawer.Group>
                <FilterDrawer.Group label="Scheduled Date">
                  <FilterDrawer.Options>
                    <Radio value="scheduledStartTime-asc">
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio value="scheduledStartTime-desc">
                      <FormLabel label="Latest first" />
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
                <FilterDrawer.Group label="Status">
                  <FilterDrawer.Options>
                    <Radio value="status-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="status-desc">
                      <FormLabel label="Z–A" />
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
