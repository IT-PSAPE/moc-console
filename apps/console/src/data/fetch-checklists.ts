import { supabase } from "@moc/data/supabase";
import type { Checklist } from "@moc/types/checklists";
import { getCurrentWorkspaceId } from "./current-workspace";

type ChecklistTemplateRow = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

type ChecklistRunRow = ChecklistTemplateRow & {
  scheduled_at: string;
};

type TemplateSectionRow = {
  id: string;
  checklist_template_id: string;
  name: string;
  sort_order: number;
};

type TemplateItemRow = {
  id: string;
  checklist_template_id: string;
  template_section_id: string | null;
  label: string;
  sort_order: number;
};

type ChecklistSectionRow = {
  id: string;
  checklist_id: string;
  name: string;
  sort_order: number;
};

type ChecklistItemRow = {
  id: string;
  checklist_id: string;
  section_id: string | null;
  label: string;
  checked: boolean;
  sort_order: number;
};

function mapTemplateChecklist(template: ChecklistTemplateRow, sections: TemplateSectionRow[], items: TemplateItemRow[]): Checklist {
  const sectionRows = sections
    .filter((section) => section.checklist_template_id === template.id)
    .sort((left, right) => left.sort_order - right.sort_order);
  const itemRows = items.filter((item) => item.checklist_template_id === template.id);

  return {
    id: template.id,
    kind: "template",
    name: template.name,
    description: template.description,
    items: itemRows
      .filter((item) => item.template_section_id === null)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => ({ id: item.id, label: item.label, checked: false })),
    sections: sectionRows.map((section) => ({
      id: section.id,
      name: section.name,
      items: itemRows
        .filter((item) => item.template_section_id === section.id)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => ({ id: item.id, label: item.label, checked: false })),
    })),
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

function mapChecklistRun(run: ChecklistRunRow, sections: ChecklistSectionRow[], items: ChecklistItemRow[]): Checklist {
  const sectionRows = sections
    .filter((section) => section.checklist_id === run.id)
    .sort((left, right) => left.sort_order - right.sort_order);
  const itemRows = items.filter((item) => item.checklist_id === run.id);

  return {
    id: run.id,
    kind: "instance",
    name: run.name,
    description: run.description,
    scheduledAt: run.scheduled_at,
    items: itemRows
      .filter((item) => item.section_id === null)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => ({ id: item.id, label: item.label, checked: item.checked })),
    sections: sectionRows.map((section) => ({
      id: section.id,
      name: section.name,
      items: itemRows
        .filter((item) => item.section_id === section.id)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => ({ id: item.id, label: item.label, checked: item.checked })),
    })),
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  };
}

export async function fetchChecklists(): Promise<Checklist[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const [templateResult, runResult] = await Promise.all([
    supabase.from("checklist_templates").select("id, name, description, created_at, updated_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("checklists").select("id, name, description, scheduled_at, created_at, updated_at").eq("workspace_id", workspaceId).order("scheduled_at", { ascending: true }),
  ]);

  if (templateResult.error) throw new Error(templateResult.error.message);
  if (runResult.error) throw new Error(runResult.error.message);

  const templates = (templateResult.data ?? []) as ChecklistTemplateRow[];
  const runs = (runResult.data ?? []) as ChecklistRunRow[];
  const templateIds = templates.map((template) => template.id);
  const runIds = runs.map((run) => run.id);
  const [templateSectionsResult, templateItemsResult, sectionsResult, itemsResult] = await Promise.all([
    templateIds.length > 0 ? supabase.from("template_sections").select("id, checklist_template_id, name, sort_order").in("checklist_template_id", templateIds) : Promise.resolve({ data: [], error: null }),
    templateIds.length > 0 ? supabase.from("template_items").select("id, checklist_template_id, template_section_id, label, sort_order").in("checklist_template_id", templateIds) : Promise.resolve({ data: [], error: null }),
    runIds.length > 0 ? supabase.from("checklist_sections").select("id, checklist_id, name, sort_order").in("checklist_id", runIds) : Promise.resolve({ data: [], error: null }),
    runIds.length > 0 ? supabase.from("checklist_items").select("id, checklist_id, section_id, label, checked, sort_order").in("checklist_id", runIds) : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [templateSectionsResult, templateItemsResult, sectionsResult, itemsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return [
    ...templates.map((template) => mapTemplateChecklist(template, templateSectionsResult.data as TemplateSectionRow[], templateItemsResult.data as TemplateItemRow[])),
    ...runs.map((run) => mapChecklistRun(run, sectionsResult.data as ChecklistSectionRow[], itemsResult.data as ChecklistItemRow[])),
  ];
}

export async function fetchChecklistById(id: string): Promise<Checklist | undefined> {
  const checklists = await fetchChecklists();
  return checklists.find((checklist) => checklist.id === id);
}
