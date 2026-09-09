import { Search } from "lucide-react";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { Paragraph } from "@moc/ui/components/display/text";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { Input } from "@moc/ui/components/form/input";
import { AssignedMemberList } from "./assigned-member-list";
import { AvailableMemberRow } from "./available-member-row";
import { useMemberPicker } from "./use-member-picker";

type MemberPickerPanelProps = {
  assignees: ResolvedAssignee[];
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
};

export function MemberPickerPanel({ assignees, onAdd, onRemove }: MemberPickerPanelProps) {
  const { state, actions } = useMemberPicker({ assignees, onAdd });

  function renderAvailableMember(member: typeof state.available[number]) {
    return <AvailableMemberRow key={member.id} user={member} onSelect={actions.selectMember} />;
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
