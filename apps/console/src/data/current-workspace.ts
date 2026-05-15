import { supabase } from "@moc/data/supabase";

const fallbackWorkspaceSlug = "default-workspace";

type WorkspaceMembershipRow = {
  workspace_id: string;
};

type WorkspaceRow = {
  id: string;
};

let cachedUserId: string | null = null;
let cachedWorkspaceId: string | null = null;
let pendingWorkspaceIdPromise: Promise<string> | null = null;
let currentWorkspaceIdMirror: string | null = null;

async function resolveFallbackWorkspaceId(): Promise<string> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", fallbackWorkspaceSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const workspace = data as WorkspaceRow | null;

  if (!workspace?.id) {
    throw new Error("Default workspace not found");
  }

  return workspace.id;
}

export async function getCurrentWorkspaceId(): Promise<string> {
  if (currentWorkspaceIdMirror) {
    return currentWorkspaceIdMirror;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return resolveFallbackWorkspaceId();
  }

  if (cachedUserId === user.id && cachedWorkspaceId) {
    return cachedWorkspaceId;
  }

  if (pendingWorkspaceIdPromise) {
    return pendingWorkspaceIdPromise;
  }

  pendingWorkspaceIdPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("workspace_users")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const membership = data as WorkspaceMembershipRow | null;
      const workspaceId = membership?.workspace_id ?? await resolveFallbackWorkspaceId();
      cachedUserId = user.id;
      cachedWorkspaceId = workspaceId;
      return workspaceId;
    } finally {
      pendingWorkspaceIdPromise = null;
    }
  })();

  return pendingWorkspaceIdPromise;
}

export function setCurrentWorkspaceIdMirror(id: string | null) {
  currentWorkspaceIdMirror = id;
  if (id) {
    cachedWorkspaceId = id;
  }
}

export function clearCurrentWorkspaceCache() {
  cachedUserId = null;
  cachedWorkspaceId = null;
  pendingWorkspaceIdPromise = null;
  currentWorkspaceIdMirror = null;
}
