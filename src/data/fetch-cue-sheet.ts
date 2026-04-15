import type { Checklist, CueSheetEvent, Track } from "@/types/cue-sheet";
import type { Cue } from "@/types/cue-sheet";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

type EventTemplateRow = {
  id: string;
  title: string;
  description: string;
  duration: number;
  created_at: string;
  updated_at: string;
};

type EventRunRow = EventTemplateRow & {
  scheduled_at: string;
};

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

type ColorRow = {
  key: string;
};

type TemplateCueRow = {
  id: string;
  label: string;
  start: number;
  duration: number;
  type: Cue["type"];
  assignee: string | null;
  notes: string | null;
};

type EventCueRow = TemplateCueRow;

type TemplateTrackRow = {
  id: string;
  event_template_id: string;
  name: string;
  sort_order: number;
  colors: ColorRow | ColorRow[] | null;
  template_cues: TemplateCueRow[] | null;
};

type EventTrackRow = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  colors: ColorRow | ColorRow[] | null;
  cues: EventCueRow[] | null;
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

function mapCueRow(row: TemplateCueRow | EventCueRow): Cue {
  return {
    id: row.id,
    label: row.label,
    startMin: row.start,
    durationMin: row.duration,
    type: row.type,
    assignee: row.assignee ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapTrackRow(row: TemplateTrackRow | EventTrackRow, cueRows: Array<TemplateCueRow | EventCueRow> | null): Track {
  const color = Array.isArray(row.colors) ? row.colors[0] : row.colors;

  return {
    id: row.id,
    name: row.name,
    colorKey: (color?.key ?? "blue") as Track["colorKey"],
    cues: (cueRows ?? [])
      .map(mapCueRow)
      .sort((left, right) => left.startMin - right.startMin),
  };
}

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

function mapRunChecklist(run: ChecklistRunRow, sections: ChecklistSectionRow[], items: ChecklistItemRow[]): Checklist {
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

async function fetchWorkspaceScopedEvents() {
  const workspaceId = await getCurrentWorkspaceId();

  return Promise.all([
    supabase
      .from("event_templates")
      .select("id, title, description, duration, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, title, description, scheduled_at, duration, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("scheduled_at", { ascending: true }),
  ]);
}

async function fetchWorkspaceScopedChecklists() {
  const workspaceId = await getCurrentWorkspaceId();

  return Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, description, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("checklists")
      .select("id, name, description, scheduled_at, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("scheduled_at", { ascending: true }),
  ]);
}

export async function fetchCueSheetEvents(): Promise<CueSheetEvent[]> {
  const [templatesResult, runsResult] = await fetchWorkspaceScopedEvents();

  if (templatesResult.error) {
    throw new Error(templatesResult.error.message);
  }

  if (runsResult.error) {
    throw new Error(runsResult.error.message);
  }

  const templates = ((templatesResult.data ?? []) as EventTemplateRow[]).map((template) => ({
    id: template.id,
    kind: "template" as const,
    title: template.title,
    description: template.description,
    duration: template.duration,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  }));
  const runs = ((runsResult.data ?? []) as EventRunRow[]).map((run) => ({
    id: run.id,
    kind: "instance" as const,
    title: run.title,
    description: run.description,
    scheduledAt: run.scheduled_at,
    duration: run.duration,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  }));

  return [...templates, ...runs];
}

export async function fetchCueSheetEventById(id: string): Promise<CueSheetEvent | undefined> {
  const [templateResult, runResult] = await Promise.all([
    supabase
      .from("event_templates")
      .select("id, title, description, duration, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, description, scheduled_at, duration, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (templateResult.error) {
    throw new Error(templateResult.error.message);
  }

  if (runResult.error) {
    throw new Error(runResult.error.message);
  }

  if (templateResult.data) {
    const template = templateResult.data as EventTemplateRow;
    return {
      id: template.id,
      kind: "template",
      title: template.title,
      description: template.description,
      duration: template.duration,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  }

  if (!runResult.data) {
    return undefined;
  }

  const run = runResult.data as EventRunRow;
  return {
    id: run.id,
    kind: "instance",
    title: run.title,
    description: run.description,
    scheduledAt: run.scheduled_at,
    duration: run.duration,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  };
}

export async function fetchCueSheetChecklists(): Promise<Checklist[]> {
  const [[templateResult, runResult], [templateSectionsResult, templateItemsResult, sectionsResult, itemsResult]] = await Promise.all([
    fetchWorkspaceScopedChecklists(),
    Promise.all([
      supabase.from("template_sections").select("id, checklist_template_id, name, sort_order"),
      supabase.from("template_items").select("id, checklist_template_id, template_section_id, label, sort_order"),
      supabase.from("checklist_sections").select("id, checklist_id, name, sort_order"),
      supabase.from("checklist_items").select("id, checklist_id, section_id, label, checked, sort_order"),
    ]),
  ]);

  for (const result of [templateResult, runResult, templateSectionsResult, templateItemsResult, sectionsResult, itemsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const templates = ((templateResult.data ?? []) as ChecklistTemplateRow[]).map((template) => mapTemplateChecklist(
    template,
    (templateSectionsResult.data ?? []) as TemplateSectionRow[],
    (templateItemsResult.data ?? []) as TemplateItemRow[],
  ));
  const runs = ((runResult.data ?? []) as ChecklistRunRow[]).map((run) => mapRunChecklist(
    run,
    (sectionsResult.data ?? []) as ChecklistSectionRow[],
    (itemsResult.data ?? []) as ChecklistItemRow[],
  ));

  return [...templates, ...runs];
}

export async function fetchCueSheetChecklistById(id: string): Promise<Checklist | undefined> {
  const checklists = await fetchCueSheetChecklists();
  return checklists.find((checklist) => checklist.id === id);
}

export async function fetchCueSheetTracks(): Promise<Record<string, Track[]>> {
  const [templateTracksResult, eventTracksResult] = await Promise.all([
    supabase
      .from("template_tracks")
      .select(`
        id,
        event_template_id,
        name,
        sort_order,
        colors:color_id(key),
        template_cues(id, label, start, duration, type, assignee, notes)
      `)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tracks")
      .select(`
        id,
        event_id,
        name,
        sort_order,
        colors:color_id(key),
        cues(id, label, start, duration, type, assignee, notes)
      `)
      .order("sort_order", { ascending: true }),
  ]);

  if (templateTracksResult.error) {
    throw new Error(templateTracksResult.error.message);
  }

  if (eventTracksResult.error) {
    throw new Error(eventTracksResult.error.message);
  }

  const tracksByOwnerId: Record<string, Track[]> = {};

  for (const track of (templateTracksResult.data ?? []) as TemplateTrackRow[]) {
    const ownerId = track.event_template_id;
    const currentTracks = tracksByOwnerId[ownerId] ?? [];
    currentTracks.push(mapTrackRow(track, track.template_cues));
    tracksByOwnerId[ownerId] = currentTracks;
  }

  for (const track of (eventTracksResult.data ?? []) as EventTrackRow[]) {
    const ownerId = track.event_id;
    const currentTracks = tracksByOwnerId[ownerId] ?? [];
    currentTracks.push(mapTrackRow(track, track.cues));
    tracksByOwnerId[ownerId] = currentTracks;
  }

  return tracksByOwnerId;
}

export async function fetchCueSheetTracksByEventId(eventId: string): Promise<Track[]> {
  const tracksByOwnerId = await fetchCueSheetTracks();
  return tracksByOwnerId[eventId] ?? [];
}
