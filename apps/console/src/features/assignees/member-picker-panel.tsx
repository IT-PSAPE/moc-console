import { ArrowLeft, Search } from "lucide-react";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { Button } from "@moc/ui/components/controls/button";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { Input } from "@moc/ui/components/form/input";
import { Radio, RadioGroup } from "@moc/ui/components/form/radio";
import { AssignedMemberList } from "./assigned-member-list";
import { AvailableMemberRow } from "./available-member-row";
import { useMemberPicker } from "./use-member-picker";

type MemberPickerPanelProps = {
  assignees: ResolvedAssignee[];
  duties: readonly string[];
  onAdd: (userId: string, duty: string) => void;
  onRemove: (userId: string) => void;
};

export function MemberPickerPanel({ assignees, duties, onAdd, onRemove }: MemberPickerPanelProps) {
  const { state, actions } = useMemberPicker({ assignees, onAdd });

  function renderDuty(duty: string) {
    return <Radio key={duty} value={duty} className="w-full py-1.5"><Label.sm>{duty}</Label.sm></Radio>;
  }

  function renderAvailableMember(member: typeof state.available[number]) {
    return <AvailableMemberRow key={member.id} user={member} onSelect={actions.selectMember} />;
  }

  if (state.step === "pick-duty" && state.selectedUser) {
    return (
      <>
        <div className="flex items-center gap-2 border-b border-secondary p-2">
          <Button.Icon aria-label="Back to members" variant="ghost" icon={<ArrowLeft />} onClick={actions.back} />
          <UserAvatar size="sm" user={state.selectedUser} />
          <Label.sm className="min-w-0 flex-1">{state.selectedUser.name} {state.selectedUser.surname}</Label.sm>
        </div>
        <div className="border-b border-secondary py-2">
          <Paragraph.xs className="px-3 pb-1.5 text-quaternary">Select a duty</Paragraph.xs>
          <RadioGroup name="assignee-duty" value={state.duty} onValueChange={actions.setDuty} className="max-h-40 space-y-0.5 overflow-y-auto px-2">
            {duties.map(renderDuty)}
          </RadioGroup>
        </div>
        <div className="border-b border-secondary p-2">
          <Paragraph.xs className="px-1 pb-1.5 text-quaternary">Or type a custom duty</Paragraph.xs>
          <Input aria-label="Custom duty" autoComplete="off" name="custom-duty" placeholder="e.g. Camera 1 — main" value={state.duty} onChange={actions.changeCustomDuty} />
        </div>
        <div className="p-2"><Button className="w-full" disabled={!state.duty} onClick={actions.confirm}>Add member</Button></div>
      </>
    );
  }

  return (
    <>
      <div className="border-b border-secondary p-2">
        <Input aria-label="Search members" autoComplete="off" name="member-search" icon={<Search />} placeholder="Search members…" value={state.search} onChange={actions.changeSearch} />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {state.isLoading && <div className="flex justify-center py-4"><Spinner size="sm" /></div>}
        {!state.isLoading && state.assignedFiltered.length > 0 && (
          <section>
            <Paragraph.xs className="px-3 pb-1 pt-2 text-quaternary">Assigned</Paragraph.xs>
            <div className="px-3 pb-1"><AssignedMemberList assignees={state.assignedFiltered} onRemove={onRemove} /></div>
          </section>
        )}
        {!state.isLoading && state.available.length > 0 && (
          <section className={state.assignedFiltered.length > 0 ? "border-t border-secondary" : undefined}>
            <Paragraph.xs className="px-3 pb-1 pt-2 text-quaternary">{state.assignedFiltered.length > 0 ? "Available" : "Members"}</Paragraph.xs>
            <div className="flex flex-col gap-0.5 px-1 pb-1">{state.available.map(renderAvailableMember)}</div>
          </section>
        )}
        {!state.isLoading && state.assignedFiltered.length === 0 && state.available.length === 0 && (
          <div className="px-3 py-4 text-center"><Paragraph.sm className="text-quaternary">No members found</Paragraph.sm></div>
        )}
      </div>
    </>
  );
}
