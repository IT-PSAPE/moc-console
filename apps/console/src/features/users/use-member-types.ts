import { useCallback, useEffect } from "react";
import type { MemberType } from "@moc/notifications";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { assignMemberType, fetchMemberTypes, saveMemberTypeAndFetch } from "./member-type-service";

const emptyMemberTypes: MemberType[] = [];

export function useMemberTypes(onAssigned: (userId: string, typeId: string) => void) {
  const { currentWorkspaceId, role } = useWorkspace();
  const { toast } = useFeedback();
  const resource = useWorkspaceResource({ emptyValue: emptyMemberTypes, fetcher: fetchMemberTypes, resource: "member-types", workspaceId: currentWorkspaceId });
  const { data: types, error, setData } = resource;
  const showError = useCallback((error: unknown): void => {
    toast({ title: "Member type update failed", description: error instanceof Error ? error.message : "Try again", variant: "error" });
  }, [toast]);

  useEffect(() => {
    if (error) showError(error);
  }, [error, showError]);

  const save = useCallback(async (name: string, id: string | null): Promise<MemberType> => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Enter a member type name");
    const { types, savedType } = await saveMemberTypeAndFetch(currentWorkspaceId, normalizedName, id);
    setData(types);
    return savedType;
  }, [currentWorkspaceId, setData]);

  const assign = useCallback(async (userId: string, typeId: string): Promise<void> => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    try {
      await assignMemberType(currentWorkspaceId, userId, typeId);
      onAssigned(userId, typeId);
    } catch (error) {
      showError(error);
      throw error;
    }
  }, [currentWorkspaceId, onAssigned, showError]);

  const create = useCallback((name: string) => save(name, null), [save]);
  const rename = useCallback((type: MemberType, name: string) => save(name, type.id), [save]);
  return { state: { types }, actions: { create, rename, assign }, meta: { canEdit: role?.can_update === true, workspaceId: currentWorkspaceId } };
}
