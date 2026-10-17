import type { ChangeEvent, ReactNode } from "react";
import { Archive, Calendar, Check, CircleDashed, Clock, History, Loader, Tag, User } from "lucide-react";
import { Badge } from "@moc/ui/components/display/badge";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Paragraph } from "@moc/ui/components/display/text";
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields";
import { Input } from "@moc/ui/components/form/input";
import { Select } from "@moc/ui/components/form/select";
import { ManagedOptionPicker } from "@moc/ui/components/form/managed-option-picker";
import type { Category, Request, RequestCategoryDefinition, Status } from "@moc/types/requests";
import { getCategoryLabel, statusColor, statusLabel } from "@moc/types/requests";
import { formatUtcIsoForBrowserDateTimeInput, formatUtcIsoInBrowserTimeZone, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";
import { useRequests } from "./request-provider";
import { useWorkspace } from "@/lib/workspace-context";

const statusIcon: Record<Status, ReactNode> = { not_started: <CircleDashed />, in_progress: <Loader />, completed: <Check />, archived: <Archive /> };
const statuses: Status[] = ["not_started", "in_progress", "completed", "archived"];
const statusItems = statuses.map((value) => ({ label: statusLabel[value], value }));

type RequestMetaFieldsProps = { request: Request; categories: RequestCategoryDefinition[]; editable?: boolean; onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void };

export function RequestMetaFields({ request, categories, editable = false, onFieldChange }: RequestMetaFieldsProps) {
  const availableCategories = categories.filter((category) => category.active || category.key === request.category);
  const { role, currentWorkspaceId } = useWorkspace();
  const { actions: { createRequestType, renameRequestType, setRequestTypeActive } } = useRequests();
  const canManageTypes = role?.can_manage_roles === true;
  const onCreateType = canManageTypes ? createRequestType : undefined;
  const onRenameType = canManageTypes ? renameRequestType : undefined;
  const onTypeActiveChange = canManageTypes ? setRequestTypeActive : undefined;
  function changeDueDate(value: string) { if (value && onFieldChange) onFieldChange("dueDate", parseBrowserDateTimeInputToUtcIso(value)); }
  function changeStatus(value: Status | null) { if (value && onFieldChange) onFieldChange("status", value); }
  function changeCategory(category: RequestCategoryDefinition | null) {
    if (!category || !onFieldChange) return;
    onFieldChange("category", category.key as Category);
    onFieldChange("categoryName", category.name);
  }
  function changeRequestedBy(event: ChangeEvent<HTMLInputElement>) { onFieldChange?.("requestedBy", event.target.value); }
  function renderStatus(value: Status) { return <Select.Item key={value} value={value}>{statusLabel[value]}</Select.Item>; }
  function getCategoryKey(category: RequestCategoryDefinition) { return category.key; }
  function getCategoryName(category: RequestCategoryDefinition) { return category.name; }
  function getCategoryActive(category: RequestCategoryDefinition) { return category.active; }
  const isEditable = editable && Boolean(onFieldChange);

  return (
    <div className="space-y-3">
      <MetaRow icon={<Loader />} label="Status">{isEditable ? <Select.Root name="request-status" items={statusItems} value={request.status} onValueChange={changeStatus}><Select.Trigger aria-label="Request status" style="ghost" /><Select.Content>{statuses.map(renderStatus)}</Select.Content></Select.Root> : <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={statusColor[request.status]} />}</MetaRow>
      <MetaRow icon={<Tag />} label="Type">{isEditable ? <ManagedOptionPicker.Root key={currentWorkspaceId ?? "none"} options={availableCategories} value={request.category} onValueChange={changeCategory} getOptionKey={getCategoryKey} getOptionLabel={getCategoryName} getOptionActive={getCategoryActive} onCreate={onCreateType} onRename={onRenameType} onActiveChange={onTypeActiveChange} label="Type" placeholder="Choose a type"><ManagedOptionPicker.Field style="ghost" className="w-full max-w-48 landscape:max-w-none" /><ManagedOptionPicker.Content /></ManagedOptionPicker.Root> : <Badge label={getCategoryLabel(request.category, request.categoryName)} icon={<Tag />} color="purple" />}</MetaRow>
      <MetaRow icon={<Calendar />} label="Due date">{isEditable ? <DateTimeFields ariaLabel="Due date" name="due-date" value={formatUtcIsoForBrowserDateTimeInput(request.dueDate)} onChange={changeDueDate} required style="ghost" fieldLabels="hidden" /> : <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.dueDate)}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<User />} label="Requested by">{isEditable ? <Input aria-label="Requested by" name="requested-by" autoComplete="name" value={request.requestedBy} onChange={changeRequestedBy} placeholder="Requester name" className="max-w-48" style="ghost" /> : <Paragraph.sm className={request.requestedBy ? undefined : "text-quaternary"}>{request.requestedBy || "No requester"}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<Clock />} label="Created time"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.createdAt)}</Paragraph.sm></MetaRow>
      <MetaRow icon={<History />} label="Last updated"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(request.updatedAt)}</Paragraph.sm></MetaRow>
    </div>
  );
}
