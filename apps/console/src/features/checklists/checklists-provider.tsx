import { fetchChecklists } from "@/data/fetch-checklists";
import {
  createBlankChecklist as createBlankChecklistRecord,
  createChecklistInstance as createChecklistInstanceRecord,
  deleteChecklist,
  saveChecklist,
  type CreateBlankChecklistInput,
  type CreateChecklistInstanceOverrides,
} from "@/data/mutate-checklists";
import { useWorkspace } from "@/lib/workspace-context";
import type { Checklist } from "@moc/types/checklists";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ChecklistsContextValue = {
  state: {
    checklists: Checklist[];
    isLoadingChecklists: boolean;
  };
  actions: {
    loadChecklists: () => Promise<void>;
    syncChecklist: (checklist: Checklist) => Promise<void>;
    createChecklistInstance: (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => Promise<Checklist>;
    createBlankChecklist: (input: CreateBlankChecklistInput) => Promise<Checklist>;
    removeChecklist: (id: string) => Promise<void>;
  };
};

const ChecklistsContext = createContext<ChecklistsContextValue | null>(null);

export function ChecklistsProvider({ children }: { children: ReactNode }) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);
  const loadedWorkspaceRef = useRef<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const { currentWorkspaceId } = useWorkspace();
  const [trackedWorkspaceId, setTrackedWorkspaceId] = useState(currentWorkspaceId);

  if (trackedWorkspaceId !== currentWorkspaceId) {
    setTrackedWorkspaceId(currentWorkspaceId);
    setChecklists([]);
  }

  const loadChecklists = useCallback(async () => {
    if (loadedWorkspaceRef.current === currentWorkspaceId) return;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    setIsLoadingChecklists(true);
    loadPromiseRef.current = fetchChecklists()
      .then((data) => {
        setChecklists(data);
        loadedWorkspaceRef.current = currentWorkspaceId;
      })
      .finally(() => {
        loadPromiseRef.current = null;
        setIsLoadingChecklists(false);
      });

    return loadPromiseRef.current;
  }, [currentWorkspaceId]);

  const syncChecklist = useCallback(async (checklist: Checklist) => {
    const savedChecklist = await saveChecklist(checklist);
    setChecklists((current) => {
      const exists = current.some((entry) => entry.id === savedChecklist.id);
      return exists
        ? current.map((entry) => entry.id === savedChecklist.id ? savedChecklist : entry)
        : [savedChecklist, ...current];
    });
  }, []);

  const createChecklistInstance = useCallback(async (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => {
    const checklist = await createChecklistInstanceRecord(template, overrides);
    setChecklists((current) => [checklist, ...current]);
    return checklist;
  }, []);

  const createBlankChecklist = useCallback(async (input: CreateBlankChecklistInput) => {
    const checklist = await createBlankChecklistRecord(input);
    setChecklists((current) => [checklist, ...current]);
    return checklist;
  }, []);

  const removeChecklist = useCallback(async (id: string) => {
    await deleteChecklist(id);
    setChecklists((current) => current.filter((checklist) => checklist.id !== id));
  }, []);

  const value = useMemo<ChecklistsContextValue>(() => ({
    state: { checklists, isLoadingChecklists },
    actions: { loadChecklists, syncChecklist, createChecklistInstance, createBlankChecklist, removeChecklist },
  }), [checklists, isLoadingChecklists, loadChecklists, syncChecklist, createChecklistInstance, createBlankChecklist, removeChecklist]);

  return <ChecklistsContext.Provider value={value}>{children}</ChecklistsContext.Provider>;
}

export function useChecklists() {
  const context = useContext(ChecklistsContext);
  if (!context) throw new Error("useChecklists must be used within a ChecklistsProvider");
  return context;
}
