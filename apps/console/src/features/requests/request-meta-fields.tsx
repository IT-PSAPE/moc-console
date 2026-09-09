import type { ChangeEvent, ReactNode } from "react";
import { Archive, Calendar, Check, CircleAlert, CircleChevronDown, CircleDashed, Clock, History, Loader, Tag, User } from "lucide-react";
import { Badge } from "@moc/ui/components/display/badge";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Paragraph } from "@moc/ui/components/display/text";
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields";
import { Input } from "@moc/ui/components/form/input";
import { Select } from "@moc/ui/components/form/select";
import type { Category, Priority, Request, Status } from "@moc/types/requests";
import { categoryLabel, priorityColor, priorityLabel, statusColor, statusLabel } from "@moc/types/requests";
import { formatUtcIsoForBrowserDateTimeInput, formatUtcIsoInBrowserTimeZone, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";

const statusIcon: Record<Status, ReactNode> = { not_started: <CircleDashed />, in_progress: <Loader />, completed: <Check />, archived: <Archive /> };
const statuses: Status[] = ["not_started", "in_progress", "completed", "archived"];
const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const categories: Category[] = ["video_production", "video_shooting", "graphic_design", "event", "education"];
const statusItems = statuses.map((value) => ({ label: statusLabel[value], value }));
const priorityItems = priorities.map((value) => ({ label: priorityLabel[value], value }));
const categoryItems = categories.map((value) => ({ label: categoryLabel[value], value }));

type RequestMetaFieldsProps = { request: Request; editable?: boolean; onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void };

export function RequestMetaFields({ request, editable = false, onFieldChange }: RequestMetaFieldsProps) {
  function changeDueDate(value: string) { if (value && onFieldChange) onFieldChange("dueDate", parseBrowserDateTimeInputToUtcIso(value)); }
  function changeStatus(value: Status | null) { if (value && onFieldChange) onFieldChange("status", value); }
  function changePriority(value: Priority | null) { if (value && onFieldChange) onFieldChange("priority", value); }
  function changeCategory(value: Category | null) { if (value && onFieldChange) onFieldChange("category", value); }
  function changeRequestedBy(event: ChangeEvent<HTMLInputElement>) { onFieldChange?.("requestedBy", event.target.value); }
  function renderStatus(value: Status) { return <Select.Item key={value} value={value}>{statusLabel[value]}</Select.Item>; }
  function renderPriority(value: Priority) { return <Select.Item key={value} value={value}>{priorityLabel[value]}</Select.Item>; }
  function renderCategory(value: Category) { return <Select.Item key={value} value={value}>{categoryLabel[value]}</Select.Item>; }
  const isEditable = editable && Boolean(onFieldChange);

  return (
    <div className="space-y-3">
      <MetaRow icon={<Loader />} label="Status">{isEditable ? <Select.Root name="request-status" items={statusItems} value={request.status} onValueChange={changeStatus}><Select.Trigger aria-label="Request status" style="ghost" /><Select.Content>{statuses.map(renderStatus)}</Select.Content></Select.Root> : <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={statusColor[request.status]} />}</MetaRow>
      <MetaRow icon={<CircleChevronDown />} label="Priority">{isEditable ? <Select.Root name="request-priority" items={priorityItems} value={request.priority} onValueChange={changePriority}><Select.Trigger aria-label="Request priority" style="ghost" /><Select.Content>{priorities.map(renderPriority)}</Select.Content></Select.Root> : <Badge label={priorityLabel[request.priority]} icon={<CircleAlert />} color={priorityColor[request.priority]} />}</MetaRow>
      <MetaRow icon={<Tag />} label="Type">{isEditable ? <Select.Root name="request-category" items={categoryItems} value={request.category} onValueChange={changeCategory}><Select.Trigger aria-label="Request category" style="ghost" /><Select.Content>{categories.map(renderCategory)}</Select.Content></Select.Root> : <Badge label={categoryLabel[request.category]} icon={<Tag />} color="purple" />}</MetaRow>
      <MetaRow icon={<Calendar />} label="Due date">{isEditable ? <DateTimeFields ariaLabel="Due date" name="due-date" value={formatUtcIsoForBrowserDateTimeInput(request.dueDate)} onChange={changeDueDate} required style="ghost" fieldLabels="hidden" /> : <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.dueDate)}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<User />} label="Requested by">{isEditable ? <Input aria-label="Requested by" name="requested-by" autoComplete="name" value={request.requestedBy} onChange={changeRequestedBy} placeholder="Requester name" className="max-w-48" style="ghost" /> : <Paragraph.sm className={request.requestedBy ? undefined : "text-quaternary"}>{request.requestedBy || "No requester"}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<Clock />} label="Created time"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.createdAt)}</Paragraph.sm></MetaRow>
      <MetaRow icon={<History />} label="Last updated"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.updatedAt)}</Paragraph.sm></MetaRow>
    </div>
  );
}
