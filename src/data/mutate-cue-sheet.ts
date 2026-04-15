import type { Checklist, CueSheetEvent, Track } from "@/types/cue-sheet";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { fetchCueSheetChecklistById, fetchCueSheetEventById, fetchCueSheetTracksByEventId } from "./fetch-cue-sheet";

async function resolveColorIdByKey(colorKey: Track["colorKey"]) {
  const { data, error } = await supabase
    .from("colors")
    .select("id")
    .eq("key", colorKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error(`Track color '${colorKey}' not found`);
  }

  return data.id as string;
}

async function replaceTemplateTracks(eventTemplateId: string, tracks: Track[]) {
  const existingResult = await supabase
    .from("template_tracks")
    .select("id")
    .eq("event_template_id", eventTemplateId);

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const existingTrackIds = ((existingResult.data ?? []) as Array<{ id: string }>).map((track) => track.id);

  if (existingTrackIds.length > 0) {
    const deleteCuesResult = await supabase
      .from("template_cues")
      .delete()
      .in("template_track_id", existingTrackIds);

    if (deleteCuesResult.error) {
      throw new Error(deleteCuesResult.error.message);
    }
  }

  const deleteTracksResult = await supabase
    .from("template_tracks")
    .delete()
    .eq("event_template_id", eventTemplateId);

  if (deleteTracksResult.error) {
    throw new Error(deleteTracksResult.error.message);
  }

  for (const [trackIndex, track] of tracks.entries()) {
    const colorId = await resolveColorIdByKey(track.colorKey);
    const trackInsert = await supabase
      .from("template_tracks")
      .insert({
        id: track.id,
        event_template_id: eventTemplateId,
        name: track.name,
        color_id: colorId,
        sort_order: trackIndex + 1,
      });

    if (trackInsert.error) {
      throw new Error(trackInsert.error.message);
    }

    if (track.cues.length === 0) {
      continue;
    }

    const cueInsert = await supabase
      .from("template_cues")
      .insert(track.cues.map((cue) => ({
        id: cue.id,
        template_track_id: track.id,
        label: cue.label,
        start: cue.startMin,
        duration: cue.durationMin,
        type: cue.type,
        assignee: cue.assignee ?? null,
        notes: cue.notes ?? null,
      })));

    if (cueInsert.error) {
      throw new Error(cueInsert.error.message);
    }
  }
}

async function replaceEventTracks(eventId: string, tracks: Track[]) {
  const existingResult = await supabase
    .from("tracks")
    .select("id")
    .eq("event_id", eventId);

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const existingTrackIds = ((existingResult.data ?? []) as Array<{ id: string }>).map((track) => track.id);

  if (existingTrackIds.length > 0) {
    const deleteCuesResult = await supabase
      .from("cues")
      .delete()
      .in("track_id", existingTrackIds);

    if (deleteCuesResult.error) {
      throw new Error(deleteCuesResult.error.message);
    }
  }

  const deleteTracksResult = await supabase
    .from("tracks")
    .delete()
    .eq("event_id", eventId);

  if (deleteTracksResult.error) {
    throw new Error(deleteTracksResult.error.message);
  }

  for (const [trackIndex, track] of tracks.entries()) {
    const colorId = await resolveColorIdByKey(track.colorKey);
    const trackInsert = await supabase
      .from("tracks")
      .insert({
        id: track.id,
        event_id: eventId,
        name: track.name,
        color_id: colorId,
        sort_order: trackIndex + 1,
      });

    if (trackInsert.error) {
      throw new Error(trackInsert.error.message);
    }

    if (track.cues.length === 0) {
      continue;
    }

    const cueInsert = await supabase
      .from("cues")
      .insert(track.cues.map((cue) => ({
        id: cue.id,
        track_id: track.id,
        label: cue.label,
        start: cue.startMin,
        duration: cue.durationMin,
        type: cue.type,
        assignee: cue.assignee ?? null,
        notes: cue.notes ?? null,
      })));

    if (cueInsert.error) {
      throw new Error(cueInsert.error.message);
    }
  }
}

async function replaceTemplateChecklistStructure(checklistTemplateId: string, checklist: Checklist) {
  const deleteItemsResult = await supabase
    .from("template_items")
    .delete()
    .eq("checklist_template_id", checklistTemplateId);

  if (deleteItemsResult.error) {
    throw new Error(deleteItemsResult.error.message);
  }

  const deleteSectionsResult = await supabase
    .from("template_sections")
    .delete()
    .eq("checklist_template_id", checklistTemplateId);

  if (deleteSectionsResult.error) {
    throw new Error(deleteSectionsResult.error.message);
  }

  if (checklist.sections.length > 0) {
    const sectionInsert = await supabase
      .from("template_sections")
      .insert(checklist.sections.map((section, index) => ({
        id: section.id,
        checklist_template_id: checklistTemplateId,
        name: section.name,
        sort_order: index + 1,
      })));

    if (sectionInsert.error) {
      throw new Error(sectionInsert.error.message);
    }
  }

  const itemsPayload = [
    ...checklist.items.map((item, index) => ({
      id: item.id,
      checklist_template_id: checklistTemplateId,
      template_section_id: null,
      label: item.label,
      sort_order: index + 1,
    })),
    ...checklist.sections.flatMap((section) => section.items.map((item, index) => ({
      id: item.id,
      checklist_template_id: checklistTemplateId,
      template_section_id: section.id,
      label: item.label,
      sort_order: index + 1,
    }))),
  ];

  if (itemsPayload.length === 0) {
    return;
  }

  const itemInsert = await supabase
    .from("template_items")
    .insert(itemsPayload);

  if (itemInsert.error) {
    throw new Error(itemInsert.error.message);
  }
}

async function replaceChecklistStructure(checklistId: string, checklist: Checklist) {
  const deleteItemsResult = await supabase
    .from("checklist_items")
    .delete()
    .eq("checklist_id", checklistId);

  if (deleteItemsResult.error) {
    throw new Error(deleteItemsResult.error.message);
  }

  const deleteSectionsResult = await supabase
    .from("checklist_sections")
    .delete()
    .eq("checklist_id", checklistId);

  if (deleteSectionsResult.error) {
    throw new Error(deleteSectionsResult.error.message);
  }

  if (checklist.sections.length > 0) {
    const sectionInsert = await supabase
      .from("checklist_sections")
      .insert(checklist.sections.map((section, index) => ({
        id: section.id,
        checklist_id: checklistId,
        name: section.name,
        sort_order: index + 1,
      })));

    if (sectionInsert.error) {
      throw new Error(sectionInsert.error.message);
    }
  }

  const itemsPayload = [
    ...checklist.items.map((item, index) => ({
      id: item.id,
      checklist_id: checklistId,
      section_id: null,
      label: item.label,
      checked: item.checked,
      sort_order: index + 1,
    })),
    ...checklist.sections.flatMap((section) => section.items.map((item, index) => ({
      id: item.id,
      checklist_id: checklistId,
      section_id: section.id,
      label: item.label,
      checked: item.checked,
      sort_order: index + 1,
    }))),
  ];

  if (itemsPayload.length === 0) {
    return;
  }

  const itemInsert = await supabase
    .from("checklist_items")
    .insert(itemsPayload);

  if (itemInsert.error) {
    throw new Error(itemInsert.error.message);
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

export async function createCueSheetEventInstance(template: CueSheetEvent): Promise<CueSheetEvent> {
  const { data, error } = await supabase.rpc("create_event_from_template", {
    p_template_id: template.id,
    p_scheduled_at: new Date().toISOString(),
    p_title: `${template.title} Run`,
    p_description: template.description,
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

export async function createCueSheetChecklistInstance(template: Checklist): Promise<Checklist> {
  const { data, error } = await supabase.rpc("create_checklist_from_template", {
    p_template_id: template.id,
    p_scheduled_at: new Date().toISOString(),
    p_name: `${template.name} Run`,
    p_description: template.description,
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
