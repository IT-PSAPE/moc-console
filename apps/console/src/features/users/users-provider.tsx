import { approveWorkspaceJoinRequest, fetchPendingWorkspaceUsers, fetchUsersWithRoles, fetchAvailableRoles, updateUserProfile, assignUserRole } from "@/data/fetch-users";
import type { PendingWorkspaceUser, UserWithRole } from "@/data/fetch-users";
import type { Role } from "@moc/types/requests/assignee";
import { useWorkspace } from "@/lib/workspace-context";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type UsersContextValue = {
  state: {
    users: UserWithRole[];
    pendingUsers: PendingWorkspaceUser[];
    roles: Role[];
    isLoading: boolean;
  };
  actions: {
    loadUsers: () => Promise<void>;
    updateProfile: (userId: string, fields: { name?: string; surname?: string }) => Promise<void>;
    changeRole: (userId: string, roleId: string) => Promise<void>;
    approveUser: (requestId: string) => Promise<void>;
  };
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingWorkspaceUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadedWorkspaceRef = useRef<string | null>(null);
  const promiseRef = useRef<Promise<void> | null>(null);

  const { currentWorkspaceId, refresh } = useWorkspace();
  const [trackedWorkspaceId, setTrackedWorkspaceId] = useState(currentWorkspaceId);
  if (trackedWorkspaceId !== currentWorkspaceId) {
    setTrackedWorkspaceId(currentWorkspaceId);
    setUsers([]);
    setPendingUsers([]);
  }

  const loadUsers = useCallback(async () => {
    if (loadedWorkspaceRef.current === currentWorkspaceId) return;
    if (promiseRef.current) return promiseRef.current;
    if (!currentWorkspaceId) return;

    setIsLoading(true);

    promiseRef.current = Promise.all([fetchUsersWithRoles(currentWorkspaceId), fetchPendingWorkspaceUsers(currentWorkspaceId), fetchAvailableRoles()])
      .then(([usersData, pendingUsersData, rolesData]) => {
        setUsers(usersData);
        setPendingUsers(pendingUsersData);
        setRoles(rolesData);
        loadedWorkspaceRef.current = currentWorkspaceId;
      })
      .finally(() => {
        promiseRef.current = null;
        setIsLoading(false);
      });

    return promiseRef.current;
  }, [currentWorkspaceId]);

  const updateProfile = useCallback(async (userId: string, fields: { name?: string; surname?: string }) => {
    await updateUserProfile(userId, fields);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...fields } : u)),
    );
  }, []);

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await assignUserRole(currentWorkspaceId, userId, roleId);
    await refresh();
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newRole = roles.find((r) => r.id === roleId) ?? null;
        return { ...u, role: newRole };
      }),
    );
  }, [currentWorkspaceId, refresh, roles]);

  const approveUser = useCallback(async (requestId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await approveWorkspaceJoinRequest(requestId);
    const pendingUser = pendingUsers.find((user) => user.requestId === requestId);
    const viewerRole = roles.find((role) => role.name.toLowerCase() === "viewer") ?? null;
    setPendingUsers((current) => current.filter((user) => user.requestId !== requestId));
    if (pendingUser) {
      setUsers((current) => [...current, {
        id: pendingUser.id,
        name: pendingUser.name,
        surname: pendingUser.surname,
        email: pendingUser.email,
        telegramChatId: pendingUser.telegramChatId,
        avatarUrl: pendingUser.avatarUrl,
        currentDuty: pendingUser.currentDuty,
        statusMessage: pendingUser.statusMessage,
        workspaceIds: [currentWorkspaceId],
        role: viewerRole,
      }]);
    }
  }, [currentWorkspaceId, pendingUsers, roles]);

  const value = useMemo(
    () => ({
      state: { users, pendingUsers, roles, isLoading },
      actions: { loadUsers, updateProfile, changeRole, approveUser },
    }),
    [users, pendingUsers, roles, isLoading, loadUsers, updateProfile, changeRole, approveUser],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);

  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider");
  }

  return context;
}
