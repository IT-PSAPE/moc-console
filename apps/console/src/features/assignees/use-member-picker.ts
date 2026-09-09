import { useState, type ChangeEvent } from "react";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import { useMembers } from "./use-members";

type UseMemberPickerOptions = {
  assignees: ResolvedAssignee[];
  onAdd: (userId: string) => void;
};

function memberMatchesSearch(member: Pick<User, "name" | "surname">, search: string) {
  return `${member.name} ${member.surname}`.toLowerCase().includes(search.toLowerCase());
}

export function useMemberPicker({ assignees, onAdd }: UseMemberPickerOptions) {
  const { members, isLoading } = useMembers();
  const [search, setSearch] = useState("");
  const assignedIds = new Set(assignees.map((assignee) => assignee.id));
  const assignedFiltered = assignees.filter((assignee) => memberMatchesSearch(assignee, search));
  const available = members.filter((member) => !assignedIds.has(member.id) && memberMatchesSearch(member, search));

  function selectMember(user: User) {
    onAdd(user.id);
    setSearch("");
  }

  function changeSearch(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  return {
    state: { assignedFiltered, available, isLoading, search },
    actions: { changeSearch, selectMember },
  };
}
