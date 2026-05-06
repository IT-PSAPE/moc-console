import { supabase } from "@/lib/supabase";

async function upsertAssignee(
  table: "cue_assignees" | "checklist_item_assignees",
  parentColumn: "cue_id" | "checklist_item_id",
  parentId: string,
  userId: string,
  duty: string,
): Promise<void> {
  const updateResult = await supabase
    .from(table)
    .update({ duty })
    .eq(parentColumn, parentId)
    .eq("user_id", userId)
    .select("id");

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  if ((updateResult.data ?? []).length > 0) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .insert({
      [parentColumn]: parentId,
      user_id: userId,
      duty,
    });

  if (error) {
    throw new Error(error.message);
  }
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

export async function addCueAssignee(cueId: string, userId: string, duty: string): Promise<void> {
  await upsertAssignee("cue_assignees", "cue_id", cueId, userId, duty);
}

export async function removeCueAssignee(cueId: string, userId: string): Promise<void> {
  await deleteAssignee("cue_assignees", "cue_id", cueId, userId);
}

export async function addChecklistItemAssignee(checklistItemId: string, userId: string, duty: string): Promise<void> {
  await upsertAssignee("checklist_item_assignees", "checklist_item_id", checklistItemId, userId, duty);
}

export async function removeChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  await deleteAssignee("checklist_item_assignees", "checklist_item_id", checklistItemId, userId);
}
