import { fetchAllUsers } from "@/data/fetch-assignees";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import type { User } from "@moc/types/requests";
import { useEffect } from "react";

const emptyMembers: User[] = [];

export function useMembers() {
  const { currentWorkspaceId } = useWorkspace();
  const { data: members, error, isLoading, load } = useWorkspaceResource({ emptyValue: emptyMembers, fetcher: fetchAllUsers, resource: "members", workspaceId: currentWorkspaceId });

  useEffect(() => {
    void load();
  }, [load]);

  return { members, isLoading, error, retry: load };
}
