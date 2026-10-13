import { useCallback, useEffect, useMemo } from "react";
import { fetchScheduleData } from "@/features/schedule/schedule-service";
import { getScheduleEvents } from "@/features/schedule/schedule-events";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useViewQuery } from "@/hooks/use-view-query";
import { useWorkspace } from "@/lib/workspace-context";
import { useSearchParams } from "react-router-dom";
import type { ScheduleData } from "@/features/schedule/schedule-service";
import { getBrowserTimeZone } from "@moc/utils/browser-date-time";
import { formatScheduleMonth, parseScheduleMonth, updateScheduleMonthQuery } from "@/features/schedule/schedule-query";

import { scheduleTypeOptions } from "./schedule-types";

const emptyData: ScheduleData = { bookings: [], checklists: [], requests: [], streams: [], meetings: [], venueBookings: [], messages: [] };
const scheduleTypes = ["all", "request", "equipment", "venue", "stream", "meeting", "checklist"] as const;
const messageScheduleTypes = [...scheduleTypes, "message"] as const;

export function useSchedule() {
  const { currentWorkspaceId, role } = useWorkspace();
  const canViewMessages = role?.can_update === true;
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useViewQuery(canViewMessages ? messageScheduleTypes : scheduleTypes, "all", "type");
  const month = useMemo(() => parseScheduleMonth(searchParams.get("month")), [searchParams]);
  const displayTimezone = getBrowserTimeZone();
  const fetcher = useCallback((workspaceId: string) => fetchScheduleData(workspaceId, canViewMessages), [canViewMessages]);
  const { data, error, isLoading, isInitialLoading, load } = useWorkspaceResource({
    emptyValue: emptyData,
    fetcher,
    resource: canViewMessages ? "schedule:messages" : "schedule",
    workspaceId: currentWorkspaceId,
  });
  useEffect(() => { void load(true); }, [load]);
  const allEvents = useMemo(() => getScheduleEvents(data, month, displayTimezone), [data, displayTimezone, month]);
  const events = useMemo(() => allEvents
    .filter((event) => type === "all" || event.data?.type === type)
    .sort((left, right) => left.date.getTime() - right.date.getTime()), [allEvents, type]);
  const changeMonth = useCallback((nextMonth: Date) => {
    setSearchParams(updateScheduleMonthQuery(searchParams, nextMonth), { replace: true });
  }, [searchParams, setSearchParams]);
  const changeType = useCallback((nextType: string | null) => { if (nextType) setType(nextType); }, [setType]);
  const retry = useCallback(() => load(true), [load]);

  const typeOptions = scheduleTypeOptions.filter(option => option.value !== "message" || canViewMessages);
  const typeLabel = typeOptions.find(option => option.value === type)?.label;
  const monthKey = formatScheduleMonth(month);
  return { state: { events, error, isLoading, isInitialLoading, month, monthKey, type }, actions: { changeMonth, changeType, retry }, meta: { typeOptions, typeLabel } };
}
