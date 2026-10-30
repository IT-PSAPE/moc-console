import { ScheduleAgendaList } from "@/features/schedule/schedule-agenda-list";
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar";
import { Page } from "@moc/ui/components/layout/page";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Input } from "@moc/ui/components/form/input";
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar";
import { FilterMenu } from "@moc/ui/components/overlays/filter-menu";
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Button } from "@moc/ui/components/controls/button";
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Search, Tag } from "lucide-react";
import type { ChangeEvent } from "react";
import { getEventTime, getVisibleEventTitle } from "@/features/schedule/schedule-events";
import { useSchedule } from "@/features/schedule/use-schedule";
import type { ScheduleEvent } from "@/features/schedule/schedule-types";
import { useDetailLinkState } from "@/hooks/use-detail-return";
import { calendarViewOptions } from "@/features/preferences/calendar-view-options";
import { scheduleItemIcons } from "@/features/schedule/schedule-item-icons";
import { ScheduleEventRow } from "@/features/schedule/schedule-event-row";

export function SchedulePage() {
  const { state, actions, meta } = useSchedule();
  const { returnTo } = useDetailLinkState();

  function renderEvent(event: CalendarEvent<ScheduleEvent>) {
    const scheduleEvent = event.data;
    if (!scheduleEvent) return null;
    const Icon = scheduleItemIcons[scheduleEvent.kind];
    const time = getEventTime(event, state.view === "day" || state.view === "week");
    return <InteractiveSurface.Link key={event.id} render={<Link to={scheduleEvent.href} state={{ returnTo }} />} className="block h-full w-full min-w-0" aria-label={event.label}><Calendar.Event color={event.color} title={event.label} time={time} icon={<Icon />}>{getVisibleEventTitle(scheduleEvent)}</Calendar.Event></InteractiveSurface.Link>;
  }
  function renderPreviewEvent(event: CalendarEvent<ScheduleEvent>) {
    const item = event.id ? state.eventDetails.get(event.id) : undefined;
    return item ? <ScheduleEventRow item={item} returnTo={returnTo} /> : null;
  }
  function handlePrevious() { actions.changePeriod(-1); }
  function handleNext() { actions.changePeriod(1); }
  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) { actions.changeSearch(event.target.value); }

  if (state.isInitialLoading) return <Page.Loading />;
  return (
    <Page className="flex h-full min-h-0 min-w-0 flex-col">
      <Page.Header className="!max-w-none">
        <Page.Heading><Page.Title>Work</Page.Title></Page.Heading>
        <Page.Controls>
          <Input aria-label="Search work" name="work-search" autoComplete="off" icon={<Search />} placeholder="Search work…" className="w-64 max-w-full" value={state.search} onChange={handleSearchChange} />
        </Page.Controls>
      </Page.Header>
      <CollectionToolbar className="!max-w-none shrink-0">
        <CollectionToolbar.Views>
          <SegmentedControl aria-label="Work item types" className="portrait:[&>button]:px-2" value={state.itemType} onValueChange={actions.changeItemType}>
            <SegmentedControl.Item value="all">All</SegmentedControl.Item>
            <SegmentedControl.Item value="request">Requests</SegmentedControl.Item>
            <SegmentedControl.Item value="equipment">Equipment</SegmentedControl.Item>
            <SegmentedControl.Item value="venue">Venue</SegmentedControl.Item>
          </SegmentedControl>
        </CollectionToolbar.Views>
      </CollectionToolbar>
      <Page.Content className="!max-w-none flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-0! pb-0!">
        {state.error ? <>
          <RetryNotification title="Work couldn't load" description={state.error.message} onRetry={actions.retry} isRetrying={state.isLoading} />
          <EmptyState title="Work couldn't be loaded" description={state.error.message} action={<Button variant="secondary" onClick={actions.retry}>Retry</Button>} />
        </> : null}
        {!state.error ? <Calendar.Container className="flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none [&>header]:shrink-0 [&_[data-calendar-month-days]]:min-h-0 [&_[data-calendar-month-days]]:flex-1 [&_[data-calendar-range-root]]:flex [&_[data-calendar-range-root]]:min-h-0 [&_[data-calendar-range-root]]:flex-1 [&_[data-calendar-range-root]]:flex-col [&_[data-calendar-range-content]]:flex [&_[data-calendar-range-content]]:min-h-0 [&_[data-calendar-range-content]]:flex-1 [&_[data-calendar-range-content]]:flex-col [&_[data-calendar-range-viewport]]:h-full [&_[data-calendar-range-viewport]]:max-h-none [&_[data-calendar-range-viewport]]:min-h-0 [&_[data-calendar-range-viewport]]:flex-1">
          <Calendar.Toolbar className="pr-[max(var(--spacing-page-gutter),env(safe-area-inset-right))] pl-[max(var(--spacing-page-gutter),env(safe-area-inset-left))]" date={state.date} view={state.view} views={calendarViewOptions} onViewChange={actions.changeView} onPrevious={handlePrevious} onNext={handleNext} onToday={actions.goToToday}>
            <FilterMenu.Root hasActiveFilters={state.hasActiveFilters} onReset={actions.resetFilters}>
              <FilterMenu.Trigger aria-label="Filter work" />
              <FilterMenu.Content>
                <FilterMenu.Group active={state.selectedCategories.length > 0}>
                  <FilterMenu.GroupTrigger icon={<Tag />}>Request types</FilterMenu.GroupTrigger>
                  <FilterMenu.GroupContent><FilterMenu.Options label="Request types" name="categories" options={meta.categoryOptions} selected={state.selectedCategories} onValueChange={actions.toggleFilter} /></FilterMenu.GroupContent>
                </FilterMenu.Group>
                <FilterMenu.Group active={state.selectedVenueEvents.length > 0}>
                  <FilterMenu.GroupTrigger icon={<CalendarDays />}>Venue event types</FilterMenu.GroupTrigger>
                  <FilterMenu.GroupContent><FilterMenu.Options label="Venue event types" name="venueEvents" options={meta.venueEventOptions} selected={state.selectedVenueEvents} onValueChange={actions.toggleFilter} /></FilterMenu.GroupContent>
                </FilterMenu.Group>
                <FilterMenu.Group active={state.selectedVenues.length > 0}>
                  <FilterMenu.GroupTrigger icon={<MapPin />}>Venue locations</FilterMenu.GroupTrigger>
                  <FilterMenu.GroupContent><FilterMenu.Options label="Venue locations" name="venues" options={meta.venueOptions} selected={state.selectedVenues} onValueChange={actions.toggleFilter} /></FilterMenu.GroupContent>
                </FilterMenu.Group>
                <FilterMenu.Reset />
              </FilterMenu.Content>
            </FilterMenu.Root>
          </Calendar.Toolbar>
          {state.view === "month" ? <Calendar.Month className="flex min-h-0 flex-1 flex-col" onDateSelect={actions.selectDate} date={state.month} events={state.events} renderEvent={renderEvent} renderPreviewEvent={renderPreviewEvent} /> : state.view === "day" ? <Calendar.Day date={state.date} events={state.events} renderEvent={renderEvent} currentTimeScrollRequest={state.currentTimeScrollRequest} /> : state.view === "week" ? <Calendar.Week date={state.date} events={state.events} renderEvent={renderEvent} currentTimeScrollRequest={state.currentTimeScrollRequest} /> : <ScheduleAgendaList groups={state.agendaGroups} returnTo={returnTo} />}
        </Calendar.Container> : null}
      </Page.Content>
    </Page>
  );
}
