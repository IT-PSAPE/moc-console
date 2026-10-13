import { Select } from "@moc/ui/components/form/select";
import { ChevronDown, ListFilter } from "lucide-react";
import { Page } from "@moc/ui/components/layout/page";
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert";
import { InteractiveSurface } from "@moc/ui/components/controls/interactive-surface";
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar";
import { Link } from "react-router-dom";
import { useSchedule } from "@/features/schedule/use-schedule";
import type { ScheduleEvent } from "@/features/schedule/schedule-events";
import { scheduleTypeOptions } from "@/features/schedule/schedule-types";
import { useDetailLinkState } from "@/hooks/use-detail-return";

export function SchedulePage() {
  const { state, actions, meta } = useSchedule();
  const { returnTo } = useDetailLinkState();

  function renderEvent(event: CalendarEvent<ScheduleEvent>) {
    const scheduleEvent = event.data;
    if (!scheduleEvent) return null;
    return (
      <InteractiveSurface.CardLink key={event.id} render={<Link to={scheduleEvent.href} state={{ returnTo }} />} className="w-full rounded">
        <Calendar.Event color={event.color} title={event.label}>{event.label}</Calendar.Event>
      </InteractiveSurface.CardLink>
    );
  }

  function renderFilter(option: (typeof scheduleTypeOptions)[number]) {
    return <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>;
  }

  if (state.isInitialLoading) return <Page.Loading />

  return (
    <Page>
      <Page.Header>
        <Page.Heading><Page.Title>Schedule</Page.Title></Page.Heading>
        <Page.Actions>
          <Select.Root items={meta.typeOptions} value={state.type} onValueChange={actions.changeType}>
            <Select.Trigger aria-label="Filter schedule" className="w-auto max-w-52" size="sm">
              <ListFilter className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{meta.typeLabel}</span>
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            </Select.Trigger>
            <Select.Content>{meta.typeOptions.map(renderFilter)}</Select.Content>
          </Select.Root>
        </Page.Actions>
      </Page.Header>
      <Page.Content>
        {state.error ? (
          <RetryAlert title="Schedule couldn't load" description={state.error.message} onRetry={actions.retry} isRetrying={state.isLoading} />
        ) : (
          <Calendar key={state.monthKey} defaultMonth={state.month} events={state.events} onMonthChange={actions.changeMonth} renderEvent={renderEvent} />
        )}
      </Page.Content>
    </Page>
  );
}
