import { supabase } from "@moc/data/supabase";
import { notifyAssignment, type AssignmentKind } from "./notify-assignment";

async function upsertAssignee(
  table: "cue_assignees" | "checklist_item_assignees",
  parentColumn: "cue_id" | "checklist_item_id",
  parentId: string,
  userId: string,
  duty: string,
): Promise<"inserted" | "duty_changed" | "unchanged"> {
  const existingResult = await supabase
    .from(table)
    .select("id, duty")
    .eq(parentColumn, parentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const existing = existingResult.data;

  if (existing) {
    if (existing.duty === duty) return "unchanged";
    const { error } = await supabase
      .from(table)
      .update({ duty })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return "duty_changed";
  }

  const { error } = await supabase
    .from(table)
    .insert({
      [parentColumn]: parentId,
      user_id: userId,
      duty,
    });
  if (error) throw new Error(error.message);
  return "inserted";
}

async function deleteAssignee(
  table: "cue_assignees" | "checklist_item_assignees",
  parentColumn: "cue_id" | "checklist_item_id",
  parentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq(parentColumn, parentId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function maybeNotify(
  outcome: "inserted" | "duty_changed" | "unchanged",
  kind: AssignmentKind,
  parentId: string,
  userId: string,
  duty: string,
): void {
  if (outcome === "unchanged") return;
  notifyAssignment(kind, parentId, userId, duty);
}

export async function addCueAssignee(cueId: string, userId: string, duty: string): Promise<void> {
  const outcome = await upsertAssignee("cue_assignees", "cue_id", cueId, userId, duty);
  maybeNotify(outcome, "cue", cueId, userId, duty);
}

export async function removeCueAssignee(cueId: string, userId: string): Promise<void> {
  await deleteAssignee("cue_assignees", "cue_id", cueId, userId);
}

export async function addChecklistItemAssignee(checklistItemId: string, userId: string, duty: string): Promise<void> {
  const outcome = await upsertAssignee("checklist_item_assignees", "checklist_item_id", checklistItemId, userId, duty);
  maybeNotify(outcome, "checklist_item", checklistItemId, userId, duty);
}

export async function removeChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  await deleteAssignee("checklist_item_assignees", "checklist_item_id", checklistItemId, userId);
}
