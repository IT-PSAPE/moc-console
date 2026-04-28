import type { Checklist, CueSheetEvent, Track } from "@/types/cue-sheet";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { fetchCueSheetChecklistById, fetchCueSheetEventById, fetchCueSheetTracksByEventId } from "./fetch-cue-sheet";

async function replaceTemplateTracks(eventTemplateId: string, tracks: Track[]) {
  const { error } = await supabase.rpc("save_template_tracks", {
    p_event_template_id: eventTemplateId,
    p_tracks: tracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      color_key: track.colorKey,
      sort_order: index + 1,
      cues: track.cues.map((cue) => ({
        id: cue.id,
        label: cue.label,
        start: cue.startMin,
        duration: cue.durationMin,
        type: cue.type,
        assignee: cue.assignee ?? null,
        notes: cue.notes ?? null,
      })),
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function replaceEventTracks(eventId: string, tracks: Track[]) {
  const { error } = await supabase.rpc("save_event_tracks", {
    p_event_id: eventId,
    p_tracks: tracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      color_key: track.colorKey,
      sort_order: index + 1,
      cues: track.cues.map((cue) => ({
        id: cue.id,
        label: cue.label,
        start: cue.startMin,
        duration: cue.durationMin,
        type: cue.type,
        assignee: cue.assignee ?? null,
        notes: cue.notes ?? null,
      })),
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function replaceTemplateChecklistStructure(checklistTemplateId: string, checklist: Checklist) {
  const { error } = await supabase.rpc("save_template_checklist_structure", {
    p_checklist_template_id: checklistTemplateId,
    p_checklist: {
      items: checklist.items.map((item, index) => ({
        id: item.id,
        label: item.label,
        checked: false,
        sort_order: index + 1,
      })),
      sections: checklist.sections.map((section, sectionIndex) => ({
        id: section.id,
        name: section.name,
        sort_order: sectionIndex + 1,
        items: section.items.map((item, itemIndex) => ({
          id: item.id,
          label: item.label,
          checked: false,
          sort_order: itemIndex + 1,
        })),
      })),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function replaceChecklistStructure(checklistId: string, checklist: Checklist) {
  const { error } = await supabase.rpc("save_checklist_structure", {
    p_checklist_id: checklistId,
    p_checklist: {
      items: checklist.items.map((item, index) => ({
        id: item.id,
        label: item.label,
        checked: item.checked,
        sort_order: index + 1,
      })),
      sections: checklist.sections.map((section, sectionIndex) => ({
        id: section.id,
        name: section.name,
        sort_order: sectionIndex + 1,
        items: section.items.map((item, itemIndex) => ({
          id: item.id,
          label: item.label,
          checked: item.checked,
          sort_order: itemIndex + 1,
        })),
      })),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveCueSheetEvent(event: CueSheetEvent): Promise<CueSheetEvent> {
  const workspaceId = await getCurrentWorkspaceId();

  if (event.kind === "template") {
    const { error } = await supabase
      .from("event_templates")
      .upsert({
        id: event.id,
        workspace_id: workspaceId,
        title: event.title,
        description: event.description,
        duration: event.duration,
        created_at: event.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("events")
      .upsert({
        id: event.id,
        workspace_id: workspaceId,
        title: event.title,
        description: event.description,
        scheduled_at: event.scheduledAt ?? new Date().toISOString(),
        duration: event.duration,
        created_at: event.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }
  }

  const savedEvent = await fetchCueSheetEventById(event.id);

  if (!savedEvent) {
    throw new Error("Saved event could not be reloaded");
  }

  return savedEvent;
}

export async function deleteCueSheetEvent(id: string): Promise<void> {
  const [templateResult, runResult] = await Promise.all([
    supabase.from("event_templates").delete().eq("id", id),
    supabase.from("events").delete().eq("id", id),
  ]);

  if (templateResult.error) {
    throw new Error(templateResult.error.message);
  }

  if (runResult.error) {
    throw new Error(runResult.error.message);
  }
}

export async function saveCueSheetChecklist(checklist: Checklist): Promise<Checklist> {
  const workspaceId = await getCurrentWorkspaceId();

  if (checklist.kind === "template") {
    const { error } = await supabase
      .from("checklist_templates")
      .upsert({
        id: checklist.id,
        workspace_id: workspaceId,
        name: checklist.name,
        description: checklist.description,
        created_at: checklist.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }

    await replaceTemplateChecklistStructure(checklist.id, checklist);
  } else {
    const { error } = await supabase
      .from("checklists")
      .upsert({
        id: checklist.id,
        workspace_id: workspaceId,
        name: checklist.name,
        description: checklist.description,
        scheduled_at: checklist.scheduledAt ?? new Date().toISOString(),
        created_at: checklist.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }

    await replaceChecklistStructure(checklist.id, checklist);
  }

  const savedChecklist = await fetchCueSheetChecklistById(checklist.id);

  if (!savedChecklist) {
    throw new Error("Saved checklist could not be reloaded");
  }

  return savedChecklist;
}

export async function deleteCueSheetChecklist(id: string): Promise<void> {
  const [templateResult, runResult] = await Promise.all([
    supabase.from("checklist_templates").delete().eq("id", id),
    supabase.from("checklists").delete().eq("id", id),
  ]);

  if (templateResult.error) {
    throw new Error(templateResult.error.message);
  }

  if (runResult.error) {
    throw new Error(runResult.error.message);
  }
}

export async function saveCueSheetTracks(event: Pick<CueSheetEvent, "id" | "kind">, tracks: Track[]): Promise<Track[]> {
  if (event.kind === "template") {
    await replaceTemplateTracks(event.id, tracks);
  } else {
    await replaceEventTracks(event.id, tracks);
  }

  return fetchCueSheetTracksByEventId(event.id);
}

export type CreateEventInstanceOverrides = {
  title?: string;
  description?: string;
  scheduledAt?: string;
};

export type CreateBlankEventInput = {
  title: string;
  description: string;
  duration: number;
  scheduledAt: string;
};

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

export async function createCueSheetEventInstance(template: CueSheetEvent, overrides: CreateEventInstanceOverrides = {}): Promise<CueSheetEvent> {
  const { data, error } = await supabase.rpc("create_event_from_template", {
    p_template_id: template.id,
    p_scheduled_at: overrides.scheduledAt ?? new Date().toISOString(),
    p_title: overrides.title ?? `${template.title} Run`,
    p_description: overrides.description ?? template.description,
  });

  if (error) {
    throw new Error(error.message);
  }

  const eventId = typeof data === "string" ? data : (data?.id as string | undefined);

  if (!eventId) {
    throw new Error("Event instance RPC did not return an event id");
  }

  const event = await fetchCueSheetEventById(eventId);

  if (!event) {
    throw new Error("Created event instance could not be reloaded");
  }

  return event;
}

export async function createCueSheetBlankEvent(input: CreateBlankEventInput): Promise<CueSheetEvent> {
  const now = new Date().toISOString();
  const event: CueSheetEvent = {
    id: crypto.randomUUID(),
    kind: "instance",
    title: input.title,
    description: input.description,
    duration: input.duration,
    scheduledAt: input.scheduledAt,
    createdAt: now,
    updatedAt: now,
  };

  return saveCueSheetEvent(event);
}

export async function createCueSheetChecklistInstance(template: Checklist, overrides: CreateChecklistInstanceOverrides = {}): Promise<Checklist> {
  const { data, error } = await supabase.rpc("create_checklist_from_template", {
    p_template_id: template.id,
    p_scheduled_at: overrides.scheduledAt ?? new Date().toISOString(),
    p_name: overrides.name ?? `${template.name} Run`,
    p_description: overrides.description ?? template.description,
  });

  if (error) {
    throw new Error(error.message);
  }

  const checklistId = typeof data === "string" ? data : (data?.id as string | undefined);

  if (!checklistId) {
    throw new Error("Checklist instance RPC did not return a checklist id");
  }

  const checklist = await fetchCueSheetChecklistById(checklistId);

  if (!checklist) {
    throw new Error("Created checklist instance could not be reloaded");
  }

  return checklist;
}

export async function createCueSheetBlankChecklist(input: CreateBlankChecklistInput): Promise<Checklist> {
  const now = new Date().toISOString();
  const checklist: Checklist = {
    id: crypto.randomUUID(),
    kind: "instance",
    name: input.name,
    description: input.description,
    scheduledAt: input.scheduledAt,
    items: [],
    sections: [],
    createdAt: now,
    updatedAt: now,
  };

  return saveCueSheetChecklist(checklist);
}
