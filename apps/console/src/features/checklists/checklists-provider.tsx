import { fetchChecklists } from "@/data/fetch-checklists";
import {
  createBlankChecklist as createBlankChecklistRecord,
  createChecklistInstance as createChecklistInstanceRecord,
  createChecklistTemplateFromRun as createChecklistTemplateFromRunRecord,
  deleteChecklist,
  saveChecklist,
  type CreateBlankChecklistInput,
  type CreateChecklistInstanceOverrides,
} from "@/data/mutate-checklists";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import type { Checklist } from "@moc/types/checklists";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type ChecklistsContextValue = {
  state: {
    checklists: Checklist[];
    isLoadingChecklists: boolean;
    checklistsError: Error | null;
  };
  actions: {
    loadChecklists: () => Promise<void>;
    retryChecklists: () => Promise<void>;
    syncChecklist: (checklist: Checklist) => Promise<void>;
    createChecklistInstance: (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => Promise<Checklist>;
    createBlankChecklist: (input: CreateBlankChecklistInput) => Promise<Checklist>;
    createChecklistTemplateFromRun: (run: Checklist) => Promise<Checklist>;
    removeChecklist: (id: string) => Promise<void>;
  };
};

const ChecklistsContext = createContext<ChecklistsContextValue | null>(null);
const emptyChecklists: Checklist[] = [];

export function ChecklistsProvider({ children }: { children: ReactNode }) {
  const { currentWorkspaceId } = useWorkspace();
  const { data: checklists, error: checklistsError, isLoading: isLoadingChecklists, load, updateData } = useWorkspaceResource({ emptyValue: emptyChecklists, fetcher: fetchChecklists, resource: "checklists", workspaceId: currentWorkspaceId });

  const loadChecklists = useCallback(async () => {
    await load();
  }, [load]);

  const retryChecklists = useCallback(async () => {
    await load(true);
  }, [load]);

  const syncChecklist = useCallback(async (checklist: Checklist) => {
    const savedChecklist = await saveChecklist(checklist);
    updateData((current) => {
      const exists = current.some((entry) => entry.id === savedChecklist.id);
      return exists
        ? current.map((entry) => entry.id === savedChecklist.id ? savedChecklist : entry)
        : [savedChecklist, ...current];
    });
  }, [updateData]);

  const createChecklistInstance = useCallback(async (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => {
    const checklist = await createChecklistInstanceRecord(template, overrides);
    updateData((current) => [checklist, ...current]);
    return checklist;
  }, [updateData]);

  const createBlankChecklist = useCallback(async (input: CreateBlankChecklistInput) => {
    const checklist = await createBlankChecklistRecord(input);
    updateData((current) => [checklist, ...current]);
    return checklist;
  }, [updateData]);

  const createChecklistTemplateFromRun = useCallback(async (run: Checklist) => {
    const checklist = await createChecklistTemplateFromRunRecord(run);
    updateData((current) => [checklist, ...current]);
    return checklist;
  }, [updateData]);

  const removeChecklist = useCallback(async (id: string) => {
    await deleteChecklist(id);
    updateData((current) => current.filter((checklist) => checklist.id !== id));
  }, [updateData]);

  const value = useMemo<ChecklistsContextValue>(() => ({
    state: { checklists, isLoadingChecklists, checklistsError },
    actions: { loadChecklists, retryChecklists, syncChecklist, createChecklistInstance, createBlankChecklist, createChecklistTemplateFromRun, removeChecklist },
  }), [checklists, checklistsError, createBlankChecklist, createChecklistInstance, createChecklistTemplateFromRun, isLoadingChecklists, loadChecklists, removeChecklist, retryChecklists, syncChecklist]);

  return <ChecklistsContext.Provider value={value}>{children}</ChecklistsContext.Provider>;
}

export function useChecklists() {
  const context = useContext(ChecklistsContext);
  if (!context) throw new Error("useChecklists must be used within a ChecklistsProvider");
  return context;
}
