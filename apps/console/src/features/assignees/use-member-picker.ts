import { useState, type ChangeEvent } from "react";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import { useMembers } from "./use-members";

type UseMemberPickerOptions = {
  assignees: ResolvedAssignee[];
  onAdd: (userId: string, duty: string) => void;
};

function memberMatchesSearch(member: Pick<User, "name" | "surname">, search: string) {
  return `${member.name} ${member.surname}`.toLowerCase().includes(search.toLowerCase());
}

export function useMemberPicker({ assignees, onAdd }: UseMemberPickerOptions) {
  const { members, isLoading } = useMembers();
  const [step, setStep] = useState<"browse" | "pick-duty">("browse");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [duty, setDuty] = useState("");
  const assignedIds = new Set(assignees.map((assignee) => assignee.id));
  const assignedFiltered = assignees.filter((assignee) => memberMatchesSearch(assignee, search));
  const available = members.filter((member) => !assignedIds.has(member.id) && memberMatchesSearch(member, search));

  function selectMember(user: User) {
    setSelectedUser(user);
    setDuty("");
    setStep("pick-duty");
  }

  function confirm() {
    if (!selectedUser || !duty) return;
    onAdd(selectedUser.id, duty);
    setStep("browse");
    setSelectedUser(null);
    setDuty("");
    setSearch("");
  }

  function back() {
    setStep("browse");
    setSelectedUser(null);
    setDuty("");
  }

  function changeSearch(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function changeCustomDuty(event: ChangeEvent<HTMLInputElement>) {
    setDuty(event.target.value);
  }

  return {
    state: { assignedFiltered, available, duty, isLoading, search, selectedUser, step },
    actions: { back, changeCustomDuty, changeSearch, confirm, selectMember, setDuty },
  };
}
