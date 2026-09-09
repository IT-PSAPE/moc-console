import { supabase } from "@moc/data/supabase";
import type { RequestActivity, RequestActivityType, RequestComment, RequestHistoryActor } from "@moc/types/requests";

type ActorRow = {
  id: string;
  name: string;
  surname: string;
  avatar_url: string | null;
};

type ActivityRow = {
  id: string;
  request_id: string;
  event_type: RequestActivityType;
  details: Record<string, unknown> | null;
  created_at: string;
  users: ActorRow | ActorRow[] | null;
};

type CommentRow = {
  id: string;
  request_id: string;
  body: string;
  created_at: string;
  users: ActorRow | ActorRow[] | null;
};

const ACTOR_COLUMNS = "id, name, surname, avatar_url";

function mapActor(row: ActorRow | ActorRow[] | null): RequestHistoryActor | null {
  const actor = Array.isArray(row) ? row[0] : row;
  if (!actor) return null;

  return {
    id: actor.id,
    name: actor.name,
    surname: actor.surname,
    avatarUrl: actor.avatar_url,
  };
}

function mapActivity(row: ActivityRow): RequestActivity {
  return {
    id: row.id,
    requestId: row.request_id,
    type: row.event_type,
    details: row.details ?? {},
    actor: mapActor(row.users),
    createdAt: row.created_at,
  };
}

function mapComment(row: CommentRow): RequestComment {
  return {
    id: row.id,
    requestId: row.request_id,
    body: row.body,
    actor: mapActor(row.users),
    createdAt: row.created_at,
  };
}

export async function fetchRequestActivity(requestId: string): Promise<RequestActivity[]> {
  const { data, error } = await supabase
    .from("request_activity")
    .select(`id, request_id, event_type, details, created_at, users(${ACTOR_COLUMNS})`)
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ActivityRow[]).map(mapActivity);
}

export async function fetchRequestComments(requestId: string): Promise<RequestComment[]> {
  const { data, error } = await supabase
    .from("request_comments")
    .select(`id, request_id, body, created_at, users(${ACTOR_COLUMNS})`)
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as CommentRow[]).map(mapComment);
}

export async function createRequestComment(requestId: string, body: string): Promise<RequestComment> {
  const { data, error } = await supabase
    .from("request_comments")
    .insert({ request_id: requestId, body: body.trim() })
    .select(`id, request_id, body, created_at, users(${ACTOR_COLUMNS})`)
    .single();

  if (error) throw new Error(error.message);
  return mapComment(data as CommentRow);
}
