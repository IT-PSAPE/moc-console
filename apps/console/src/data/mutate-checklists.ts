import { moc } from "@/lib/moc-client";
import type { Checklist } from "@moc/types/checklists";
import { randomId } from "@moc/utils/random-id";
import { getCurrentWorkspaceId } from "./current-workspace";
import { fetchChecklistById } from "./fetch-checklists";

export type CreateChecklistInstanceOverrides = {
  name?: string;
  description?: string;
  scheduledAt?: string;
};

export type CreateBlankChecklistInput = {
  name: string;
  description: string;
  scheduledAt: string;
};

function copyTemplateStructure(run: Checklist): Checklist {
  const now = new Date().toISOString();
  return {
    id: randomId(),
    kind: "template",
    name: `${run.name} Template`,
    description: run.description,
    items: run.items.map((item) => ({ id: randomId(), label: item.label, checked: false })),
    sections: run.sections.map((section) => ({
      id: randomId(),
      name: section.name,
      items: section.items.map((item) => ({ id: randomId(), label: item.label, checked: false })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveChecklist(checklist: Checklist): Promise<Checklist> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.checklists.save(checklist, workspaceId);
}

export async function deleteChecklist(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.checklists.delete(id, workspaceId);
}

export async function createChecklistInstance(template: Checklist, overrides: CreateChecklistInstanceOverrides = {}): Promise<Checklist> {
  const workspaceId = await getCurrentWorkspaceId();
  const checklistId = await moc.checklists.createFromTemplate(template.id, {
    scheduledAt: overrides.scheduledAt ?? new Date().toISOString(),
    name: overrides.name ?? `${template.name} Run`,
    description: overrides.description ?? template.description,
  }, workspaceId);

  const checklist = await fetchChecklistById(checklistId, workspaceId);
  if (!checklist) throw new Error("Created checklist instance could not be reloaded");
  return checklist;
}

export async function createBlankChecklist(input: CreateBlankChecklistInput): Promise<Checklist> {
  const now = new Date().toISOString();
  return saveChecklist({
    id: randomId(),
    kind: "instance",
    name: input.name,
    description: input.description,
    scheduledAt: input.scheduledAt,
    items: [],
    sections: [],
    createdAt: now,
    updatedAt: now,
  });
}

export async function createChecklistTemplateFromRun(run: Checklist): Promise<Checklist> {
  if (run.kind !== "instance") throw new Error("Only checklist runs can be converted to templates");
  return saveChecklist(copyTemplateStructure(run));
}
