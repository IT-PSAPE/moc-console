import { getScheduleAgendaGroups, getScheduleEventItem } from "./schedule-agenda";
import { useCallback, useEffect, useMemo } from "react";
import { fetchScheduleData } from "@/features/schedule/schedule-service";
import { getAgendaEvents, getScheduleEvents, matchesScheduleFilters } from "@/features/schedule/schedule-events";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import { useSearchParams } from "react-router-dom";
import type { ScheduleData } from "@/features/schedule/schedule-service";
import { getBrowserTimeZone } from "@moc/utils/browser-date-time";
import { getCalendarDateRange, getCalendarDayEvents, getCalendarMonthDays } from "@moc/utils/calendar-date-range";
import { getScheduleCalendarDates, parseScheduleItemType, updateScheduleDateQuery } from "@/features/schedule/schedule-query";
import { calendarViewOptions, getCalendarView } from "@/features/preferences/calendar-view-options";
import { useUserPreferences } from "@/features/preferences/user-preferences-provider";
import { useRequests } from "@/features/requests/request-provider";
import { useManagedVenueEventOptions, useManagedVenueOptions } from "@/features/venues/use-managed-venue-option-resource";

const emptyData: ScheduleData = { bookings: [], requests: [], venueBookings: [] };

function parseList(value: string | null): string[] { return [...new Set(value?.split(",").filter(Boolean) ?? [])]; }
function hasCustomVenueEvent(bookings: ScheduleData["venueBookings"]): boolean { return bookings.some(booking => booking.eventOther !== null); }

export function useSchedule() {
  const { state: preferences, actions: { retry: retryPreferences } } = useUserPreferences();
  const { currentWorkspaceId } = useWorkspace();
  const { state: requestState, actions: requestActions } = useRequests();
  const managedVenues = useManagedVenueOptions();
  const managedVenueEvents = useManagedVenueEventOptions();
  const { loadCategories, retryCategories } = requestActions;
  const { load: loadVenues } = managedVenues;
  const { load: loadVenueEvents } = managedVenueEvents;
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const scope = searchParams.get("workScope");
    const nextScope = currentWorkspaceId ?? "none";
    if (scope === nextScope) return;
    const next = new URLSearchParams(searchParams);
    if (scope !== null) ["types", "q", "categories", "venueEvents", "venues"].forEach(key => next.delete(key));
    next.set("workScope", nextScope);
    setSearchParams(next, { replace: true });
  }, [currentWorkspaceId, searchParams, setSearchParams]);
  const { month, date: selectedDate } = useMemo(() => getScheduleCalendarDates(searchParams), [searchParams]);
  const view = getCalendarView(searchParams.get("view"), preferences.defaultCalendarView);
  const itemType = parseScheduleItemType(searchParams.get("types"));
  const search = searchParams.get("q") ?? "";
  const selectedCategories = useMemo(() => parseList(searchParams.get("categories")), [searchParams]);
  const selectedVenueEvents = useMemo(() => parseList(searchParams.get("venueEvents")), [searchParams]);
  const selectedVenues = useMemo(() => parseList(searchParams.get("venues")), [searchParams]);
  const displayTimezone = getBrowserTimeZone();
  const fetcher = useCallback((workspaceId: string) => fetchScheduleData(workspaceId), []);
  const { data, error: resourceError, isLoading, isInitialLoading, load } = useWorkspaceResource({ emptyValue: emptyData, fetcher, resource: "work-calendar", workspaceId: currentWorkspaceId });
  useEffect(() => {
    void load(true);
    void loadCategories();
  }, [load, loadCategories]);
  const allEvents = useMemo(() => getScheduleEvents(data, displayTimezone), [data, displayTimezone]);
  const viewEvents = useMemo(() => {
    if (view === "agenda") return getAgendaEvents(allEvents);
    if (view === "month") {
      const days = getCalendarMonthDays(month);
      return allEvents.filter(event => days.some(day => getCalendarDayEvents([event], day).length > 0));
    }
    const days = getCalendarDateRange(selectedDate, view === "week" ? 7 : 1);
    return allEvents.filter(event => days.some(day => getCalendarDayEvents([event], day).length > 0));
  }, [allEvents, month, selectedDate, view]);
  const events = useMemo(() => viewEvents.filter(event => matchesScheduleFilters(event, { types: itemType === "all" ? [] : [itemType], search, categories: selectedCategories, venueEvents: selectedVenueEvents, venues: selectedVenues })), [viewEvents, itemType, search, selectedCategories, selectedVenueEvents, selectedVenues]);
  const filterSelections = useMemo(() => ({ categories: selectedCategories, venueEvents: selectedVenueEvents, venues: selectedVenues }), [selectedCategories, selectedVenueEvents, selectedVenues]);
  const filterOptions = useMemo(() => ({
    categories: requestState.requestCategories.map(({ key, name, active }) => ({ value: key, label: name, active })),
    venueEvents: [
      ...managedVenueEvents.options.map(({ id, name, active }) => ({ value: id, label: name, active })),
      ...(hasCustomVenueEvent(data.venueBookings) ? [{ value: "other", label: "Other" }] : []),
    ],
    venues: managedVenues.options.map(({ id, name, active }) => ({ value: id, label: name, active })),
  }), [data.venueBookings, managedVenueEvents.options, managedVenues.options, requestState.requestCategories]);
  const agendaGroups = useMemo(() => getScheduleAgendaGroups(events, filterOptions), [events, filterOptions]);
  const eventDetails = useMemo(() => new Map(events.flatMap(event => {
    const item = getScheduleEventItem(event, filterOptions);
    return item && event.id ? [[event.id, item] as const] : [];
  })), [events, filterOptions]);
  const hasActiveFilters = Object.values(filterSelections).some(values => values.length > 0);

  const setParamList = useCallback((key: string, values: string[]) => {
    const next = new URLSearchParams(searchParams);
    if (values.length) next.set(key, values.join(",")); else next.delete(key);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const changeItemType = useCallback((value: string) => {
    const nextType = parseScheduleItemType(value);
    setParamList("types", nextType === "all" ? [] : [nextType]);
  }, [setParamList]);
  const changeSearch = useCallback((value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value); else next.delete("q");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const changeView = useCallback((nextView: string) => {
    if (!calendarViewOptions.some(option => option.value === nextView)) return;
    const next = new URLSearchParams(searchParams);
    next.set("view", nextView);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const selectDate = useCallback((nextDate: Date) => {
    setSearchParams(updateScheduleDateQuery(searchParams, nextDate), { replace: true });
  }, [searchParams, setSearchParams]);
  const changeDate = useCallback((offset: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    selectDate(nextDate);
  }, [selectDate, selectedDate]);
  const changePeriod = useCallback((direction: -1 | 1) => {
    if (view === "month") {
      const lastDay = new Date(month.getFullYear(), month.getMonth() + direction + 1, 0).getDate();
      selectDate(new Date(month.getFullYear(), month.getMonth() + direction, Math.min(selectedDate.getDate(), lastDay)));
      return;
    }
    changeDate(direction * (view === "week" ? 7 : 1));
  }, [changeDate, month, selectDate, selectedDate, view]);
  const goToToday = useCallback(() => selectDate(new Date()), [selectDate]);
  const toggleValue = useCallback((key: string, values: string[], value: string) => setParamList(key, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]), [setParamList]);
  const toggleFilter = useCallback((name: string, value: string) => {
    if (name === "categories") toggleValue("categories", selectedCategories, value);
    if (name === "venueEvents") toggleValue("venueEvents", selectedVenueEvents, value);
    if (name === "venues") toggleValue("venues", selectedVenues, value);
  }, [selectedCategories, selectedVenueEvents, selectedVenues, toggleValue]);
  const resetFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ["categories", "venueEvents", "venues"].forEach(key => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const retry = useCallback(() => {
    retryPreferences();
    void load(true);
    void retryCategories();
    void loadVenues(true);
    void loadVenueEvents(true);
  }, [load, loadVenues, loadVenueEvents, retryCategories, retryPreferences]);
  const initialLoading = preferences.isLoading || isInitialLoading || requestState.isInitialLoadingCategories || managedVenues.isInitialLoading || managedVenueEvents.isInitialLoading;
  const loading = isLoading || requestState.isLoadingCategories || managedVenues.isLoading || managedVenueEvents.isLoading;
  const error = resourceError ?? requestState.categoriesError ?? managedVenues.error ?? managedVenueEvents.error;
  return {
    state: { events, agendaGroups, eventDetails, error, isLoading: loading, isInitialLoading: initialLoading, month, date: selectedDate, view, itemType, search, selectedCategories, selectedVenueEvents, selectedVenues, hasActiveFilters },
    actions: {
      changeView, changeItemType, changeSearch, changePeriod, selectDate, goToToday, resetFilters,
      toggleFilter,
      retry,
    },
    meta: {
      categoryOptions: filterOptions.categories,
      venueEventOptions: filterOptions.venueEvents,
      venueOptions: filterOptions.venues,
    },
  };
}
