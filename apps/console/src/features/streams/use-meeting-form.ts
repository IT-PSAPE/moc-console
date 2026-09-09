import { useEffect, useState, type ChangeEvent } from "react";
import type { CreateMeetingParams } from "@/data/mutate-zoom";
import type { NotifyDestination } from "@moc/types/streams";
import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/streams/zoom";
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time";

export const MEETING_TIMEZONES = [
  "UTC", "Africa/Harare", "Africa/Johannesburg", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

type MeetingDraft = {
  topic: string;
  description: string;
  startTime: string;
  duration: number;
  timezone: string;
  recurrenceType: ZoomRecurrenceType;
  recurrenceDays: string;
  waitingRoom: boolean;
  muteOnEntry: boolean;
  continuousChat: boolean;
  notifyDestinations: NotifyDestination[];
};

function createDraft(meeting?: ZoomMeeting | null): MeetingDraft {
  const timezone = meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    topic: meeting?.topic ?? "",
    description: meeting?.description ?? "",
    startTime: meeting?.startTime ? formatUtcIsoForDateTimeInput(meeting.startTime, timezone) : "",
    duration: meeting?.duration ?? 60,
    timezone,
    recurrenceType: meeting?.recurrenceType ?? "none",
    recurrenceDays: meeting?.recurrenceDays ?? "",
    waitingRoom: meeting?.waitingRoom ?? true,
    muteOnEntry: meeting?.muteOnEntry ?? true,
    continuousChat: meeting?.continuousChat ?? false,
    notifyDestinations: [],
  };
}

type UseMeetingFormOptions = {
  meeting?: ZoomMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: CreateMeetingParams) => Promise<void> | void;
};

export function useMeetingForm({ meeting, open, onOpenChange, onSubmit }: UseMeetingFormOptions) {
  const [draft, setDraft] = useState(() => createDraft(meeting));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardChangesOpen, setDiscardChangesOpen] = useState(false);
  const isEditing = Boolean(meeting);
  const canSubmit = Boolean(draft.topic.trim()) && Boolean(draft.startTime) && !isSubmitting;
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(createDraft(meeting));

  useEffect(() => {
    if (open) setDraft(createDraft(meeting));
  }, [meeting, open]);

  function update<K extends keyof MeetingDraft>(field: K, value: MeetingDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function close() {
    setDraft(createDraft(meeting));
    setDiscardChangesOpen(false);
    onOpenChange(false);
  }

  function requestClose() {
    if (hasChanges) {
      setDiscardChangesOpen(true);
      return;
    }
    close();
  }

  function cancelDiscardChanges() {
    setDiscardChangesOpen(false);
  }

  function changeTopic(event: ChangeEvent<HTMLInputElement>) { update("topic", event.target.value); }
  function changeDescription(event: ChangeEvent<HTMLTextAreaElement>) { update("description", event.target.value); }
  function changeDuration(event: ChangeEvent<HTMLInputElement>) { update("duration", Math.max(1, parseInt(event.target.value) || 60)); }
  function changeRecurrenceDays(event: ChangeEvent<HTMLInputElement>) { update("recurrenceDays", event.target.value); }
  function changeWaitingRoom(event: ChangeEvent<HTMLInputElement>) { update("waitingRoom", event.target.checked); }
  function changeMuteOnEntry(event: ChangeEvent<HTMLInputElement>) { update("muteOnEntry", event.target.checked); }
  function changeContinuousChat(event: ChangeEvent<HTMLInputElement>) { update("continuousChat", event.target.checked); }
  function changeTimezone(value: string | null) { if (value !== null) update("timezone", value); }
  function changeRecurrenceType(value: string) { update("recurrenceType", value as ZoomRecurrenceType); }

  async function submit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        topic: draft.topic.trim(),
        description: draft.description.trim(),
        startTime: parseDateTimeInputToUtcIso(draft.startTime, draft.timezone),
        duration: draft.duration,
        timezone: draft.timezone,
        recurrenceType: draft.recurrenceType,
        recurrenceInterval: draft.recurrenceType !== "none" ? 1 : null,
        recurrenceDays: draft.recurrenceDays || null,
        waitingRoom: draft.waitingRoom,
        muteOnEntry: draft.muteOnEntry,
        continuousChat: draft.continuousChat,
        notifyDestinations: draft.notifyDestinations,
      });
      close();
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state: { ...draft, canSubmit, isSubmitting, discardChangesOpen },
    actions: { cancelDiscardChanges, changeContinuousChat, changeDescription, changeDuration, changeMuteOnEntry, changeRecurrenceDays, changeRecurrenceType, changeTimezone, changeTopic, changeWaitingRoom, close, requestClose, setNotifyDestinations: (value: NotifyDestination[]) => update("notifyDestinations", value), setStartTime: (value: string) => update("startTime", value), submit },
    meta: { isEditing, title: isEditing ? "Edit meeting" : "Schedule meeting", submitLabel: isSubmitting ? (isEditing ? "Updating…" : "Scheduling…") : (isEditing ? "Update meeting" : "Schedule meeting") },
  };
}
