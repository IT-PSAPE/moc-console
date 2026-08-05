import { supabase } from "@moc/data/supabase";

export async function addChecklistItemAssignee(checklistItemId: string, userId: string, duty: string): Promise<void> {
  const existingResult = await supabase
    .from("checklist_item_assignees")
    .select("id, duty")
    .eq("checklist_item_id", checklistItemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingResult.error) throw new Error(existingResult.error.message);
  if (existingResult.data) {
    if (existingResult.data.duty === duty) return;
    const { error } = await supabase.from("checklist_item_assignees").update({ duty }).eq("id", existingResult.data.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("checklist_item_assignees").insert({
    checklist_item_id: checklistItemId,
    user_id: userId,
    duty,
  });
  if (error) throw new Error(error.message);
}

export async function removeChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("checklist_item_assignees")
    .delete()
    .eq("checklist_item_id", checklistItemId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
