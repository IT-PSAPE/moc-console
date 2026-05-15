import { supabase } from "@moc/data/supabase";

export type TelegramGroupTopic = {
  threadId: number;
  name: string;
  closed: boolean;
};

export type TelegramGroup = {
  chatId: string;
  title: string;
  type: string;
  isForum: boolean;
  active: boolean;
  workspaceId: string;
  addedAt: string;
  removedAt: string | null;
  topics: TelegramGroupTopic[];
};

type GroupRow = {
  chat_id: string;
  title: string;
  type: string;
  is_forum: boolean;
  active: boolean;
  workspace_id: string;
  added_at: string;
  removed_at: string | null;
  telegram_group_topics: TopicRow[] | null;
};

type TopicRow = {
  thread_id: number;
  name: string;
  closed: boolean;
};

/** Fetch telegram groups registered to the given workspace, with their topics. */
export async function fetchTelegramGroups(workspaceId: string): Promise<TelegramGroup[]> {
  const { data, error } = await supabase
    .from("telegram_groups")
    .select(
      "chat_id, title, type, is_forum, active, workspace_id, added_at, removed_at, telegram_group_topics(thread_id, name, closed)",
    )
    .eq("workspace_id", workspaceId)
    .is("removed_at", null)
    .order("added_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as GroupRow[]).map((row) => ({
    chatId: row.chat_id,
    title: row.title,
    type: row.type,
    isForum: row.is_forum,
    active: row.active,
    workspaceId: row.workspace_id,
    addedAt: row.added_at,
    removedAt: row.removed_at,
    topics: (row.telegram_group_topics ?? [])
      .map((t) => ({ threadId: t.thread_id, name: t.name, closed: t.closed }))
      .sort((a, b) => a.threadId - b.threadId),
  }));
}

/** Toggle whether a telegram group is active for sending messages. */
export async function setTelegramGroupActive(chatId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("telegram_groups")
    .update({ active })
    .eq("chat_id", chatId);

  if (error) throw new Error(error.message);
}
