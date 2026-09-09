import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { useChecklistAssignees } from "./use-checklist-assignees";

type ChecklistAssigneesContextValue = {
  state: { assigneesMap: Map<string, ResolvedAssignee[]> };
  actions: { add: (itemId: string, userId: string) => Promise<void>; remove: (itemId: string, userId: string) => Promise<void> };
};

const ChecklistAssigneesContext = createContext<ChecklistAssigneesContextValue | null>(null);

export function useChecklistAssigneesContext() {
  const context = useContext(ChecklistAssigneesContext);
  if (!context) throw new Error("Checklist assignee components must be used within ChecklistAssignees.Root");
  return context;
}

export function ChecklistAssigneesProvider({ checklistId, children }: { checklistId: string; children: ReactNode }) {
  const assignees = useChecklistAssignees(checklistId);
  return <ChecklistAssigneesContext value={{ state: assignees.state, actions: { add: assignees.actions.add, remove: assignees.actions.remove } }}>{children}</ChecklistAssigneesContext>;
}
