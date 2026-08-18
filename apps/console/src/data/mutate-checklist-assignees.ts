import { supabase } from "@moc/data/supabase";
import { notifyChecklistItemAssignment } from "./notify-assignment";

export async function addChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("checklist_item_assignees")
    .upsert(
      { checklist_item_id: checklistItemId, user_id: userId },
      { onConflict: "checklist_item_id,user_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error) throw new Error(error.message);
  // ON CONFLICT DO NOTHING returns no row when the member was already assigned,
  // so a repeat click cannot re-announce the assignment.
  if (data && data.length > 0) notifyChecklistItemAssignment(checklistItemId, userId);
}

export async function removeChecklistItemAssignee(checklistItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("checklist_item_assignees")
    .delete()
    .eq("checklist_item_id", checklistItemId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
