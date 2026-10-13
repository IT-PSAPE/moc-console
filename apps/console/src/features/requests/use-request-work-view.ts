import { useCallback, useEffect } from "react";
import { fetchAssignedRequestIds } from "@/data/fetch-assigned-request-ids";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useViewQuery } from "@/hooks/use-view-query";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { filterRequestsForWorkView, getRequestWorkViewLoadingState, type RequestWorkView } from "./request-work-view";
import type { Request } from "@moc/types/requests";

const workViews = ["all", "assigned", "due-soon", "attention"] as const;
const emptyIds: string[] = [];

export function useRequestWorkView(requests: Request[]) {
  const { currentWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const [requestedView, setView] = useViewQuery(workViews, "all", "workView");
  const view = requestedView as RequestWorkView;
  const assignedResource = `requests:assigned:${user?.id ?? "signed-out"}`;
  const { data: assignedIds, error, isLoading, isInitialLoading, load } = useWorkspaceResource({
    emptyValue: emptyIds,
    fetcher: fetchAssignedRequestIds,
    resource: assignedResource,
    workspaceId: currentWorkspaceId,
  });

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(async () => {
    await load(true);
  }, [load]);

  const visibleRequests = filterRequestsForWorkView(requests, view, new Set(assignedIds));
  const loadingState = getRequestWorkViewLoadingState(view, isLoading, isInitialLoading);

  return {
    state: { visibleRequests },
    actions: { changeView: setView, retry },
    meta: { view, error: view === "assigned" ? error : null, ...loadingState },
  };
}
