import { supabase } from "@moc/data/supabase";
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

function toChecklistStructure(checklist: Checklist) {
  return {
    items: checklist.items.map((item, index) => ({
      id: item.id,
      label: item.label,
      checked: checklist.kind === "instance" ? item.checked : false,
      sort_order: index + 1,
    })),
    sections: checklist.sections.map((section, sectionIndex) => ({
      id: section.id,
      name: section.name,
      sort_order: sectionIndex + 1,
      items: section.items.map((item, itemIndex) => ({
        id: item.id,
        label: item.label,
        checked: checklist.kind === "instance" ? item.checked : false,
        sort_order: itemIndex + 1,
      })),
    })),
  };
}

async function saveChecklistStructure(checklist: Checklist): Promise<void> {
  const functionName = checklist.kind === "template" ? "save_template_checklist_structure" : "save_checklist_structure";
  const idParameter = checklist.kind === "template" ? "p_checklist_template_id" : "p_checklist_id";
  const { error } = await supabase.rpc(functionName, {
    [idParameter]: checklist.id,
    p_checklist: toChecklistStructure(checklist),
  });

  if (error) throw new Error(error.message);
}

export async function saveChecklist(checklist: Checklist): Promise<Checklist> {
  const workspaceId = await getCurrentWorkspaceId();
  const now = new Date().toISOString();

  if (checklist.kind === "template") {
    const { error } = await supabase.from("checklist_templates").upsert({
      id: checklist.id,
      workspace_id: workspaceId,
      name: checklist.name,
      description: checklist.description,
      created_at: checklist.createdAt,
      updated_at: now,
    }, { onConflict: "id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("checklists").upsert({
      id: checklist.id,
      workspace_id: workspaceId,
      name: checklist.name,
      description: checklist.description,
      scheduled_at: checklist.scheduledAt ?? now,
      request_id: checklist.requestId ?? null,
      created_at: checklist.createdAt,
      updated_at: now,
    }, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  await saveChecklistStructure(checklist);
  const savedChecklist = await fetchChecklistById(checklist.id);
  if (!savedChecklist) throw new Error("Saved checklist could not be reloaded");
  return savedChecklist;
}

export async function deleteChecklist(id: string): Promise<void> {
  const [templateResult, runResult] = await Promise.all([
    supabase.from("checklist_templates").delete().eq("id", id),
    supabase.from("checklists").delete().eq("id", id),
  ]);
  if (templateResult.error) throw new Error(templateResult.error.message);
  if (runResult.error) throw new Error(runResult.error.message);
}

export async function createChecklistInstance(template: Checklist, overrides: CreateChecklistInstanceOverrides = {}): Promise<Checklist> {
  const { data, error } = await supabase.rpc("create_checklist_from_template", {
    p_template_id: template.id,
    p_scheduled_at: overrides.scheduledAt ?? new Date().toISOString(),
    p_name: overrides.name ?? `${template.name} Run`,
    p_description: overrides.description ?? template.description,
  });
  if (error) throw new Error(error.message);

  const checklistId = typeof data === "string" ? data : (data?.id as string | undefined);
  if (!checklistId) throw new Error("Checklist instance RPC did not return a checklist id");

  const checklist = await fetchChecklistById(checklistId);
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
