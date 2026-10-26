import type { ReactNode } from "react";
import { Archive, Calendar, Check, CircleDashed, Clock, History, Loader, Tag, User } from "lucide-react";
import { Badge } from "@moc/ui/components/display/badge";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Paragraph } from "@moc/ui/components/display/text";
import { Input } from "@moc/ui/components/form/input";
import { Select } from "@moc/ui/components/form/select";
import { ManagedOptionPicker } from "@moc/ui/components/form/managed-option-picker";
import type { RequestCategoryDefinition, Status } from "@moc/types/requests";
import { statusColor, statusLabel } from "@moc/types/requests";
import { useRequestMetaFields, type RequestMetaFieldsOptions } from "./use-request-meta-fields";

const statusIcon: Record<Status, ReactNode> = { not_started: <CircleDashed />, in_progress: <Loader />, completed: <Check />, archived: <Archive /> };
const statuses: Status[] = ["not_started", "in_progress", "completed", "archived"];
const statusItems = statuses.map((value) => ({ label: statusLabel[value], value }));

type RequestMetaFieldsProps = RequestMetaFieldsOptions & { children?: ReactNode };

export function RequestMetaFields({ request, categories, editable = false, onFieldChange, children }: RequestMetaFieldsProps) {
  const { state, actions, meta } = useRequestMetaFields({ request, categories, editable, onFieldChange });
  function renderStatus(value: Status) { return <Select.Item key={value} value={value}>{statusLabel[value]}</Select.Item>; }
  function getCategoryKey(category: RequestCategoryDefinition) { return category.key; }
  function getCategoryName(category: RequestCategoryDefinition) { return category.name; }
  function getCategoryActive(category: RequestCategoryDefinition) { return category.active; }

  return (
    <div className="space-y-3">
      <MetaRow icon={<Loader />} label="Status">{state.isEditable ? <Select.Root name="request-status" items={statusItems} value={request.status} onValueChange={actions.changeStatus}><Select.Trigger aria-label="Request status" style="ghost" /><Select.Content>{statuses.map(renderStatus)}</Select.Content></Select.Root> : <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={statusColor[request.status]} />}</MetaRow>
      <MetaRow icon={<Tag />} label="Type">{state.isEditable ? <ManagedOptionPicker.Root key={meta.currentWorkspaceId ?? "none"} options={state.availableCategories} value={request.category} onValueChange={actions.changeCategory} getOptionKey={getCategoryKey} getOptionLabel={getCategoryName} getOptionActive={getCategoryActive} onCreate={actions.createType} onRename={actions.renameType} onActiveChange={actions.setTypeActive} label="Type" placeholder="Choose a type"><ManagedOptionPicker.Field style="ghost" className="w-full max-w-48 landscape:max-w-none" /><ManagedOptionPicker.Content /></ManagedOptionPicker.Root> : <Badge label={state.categoryLabel} icon={<Tag />} color="purple" />}</MetaRow>
      <MetaRow icon={<Calendar />} label="Due date">{state.isEditable ? <Input aria-label="Due date" name="due-date" type="date" value={state.date} onChange={actions.changeDate} required style="ghost" className="max-w-56 landscape:max-w-none" /> : <Paragraph.sm>{state.dueDateLabel}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<Clock />} label="Due time">{state.isEditable ? <Input aria-label="Due time" name="due-time" type="time" value={state.time} onChange={actions.changeTime} required style="ghost" className="max-w-56 landscape:max-w-none" /> : <Paragraph.sm>{state.dueTimeLabel}</Paragraph.sm>}</MetaRow>
      <MetaRow icon={<User />} label="Requested by">{state.isEditable ? <Input aria-label="Requested by" name="requested-by" autoComplete="name" value={request.requestedBy} onChange={actions.changeRequestedBy} placeholder="Requester name" className="max-w-48" style="ghost" /> : <Paragraph.sm className={request.requestedBy ? undefined : "text-quaternary"}>{request.requestedBy || "No requester"}</Paragraph.sm>}</MetaRow>
      {children}
      <MetaRow icon={<Clock />} label="Created time"><Paragraph.sm>{state.createdAtLabel}</Paragraph.sm></MetaRow>
      <MetaRow icon={<History />} label="Last updated"><Paragraph.sm>{state.updatedAtLabel}</Paragraph.sm></MetaRow>
    </div>
  );
}
