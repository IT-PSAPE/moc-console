import { fetchUsersWithRoles, fetchAvailableRoles, updateUserProfile, assignUserRole } from "@/data/fetch-users";
import { fetchWorkspaceDirectory } from "@/data/fetch-workspaces";
import type { UserWithRole } from "@/data/fetch-users";
import type { Role } from "@moc/types/requests/assignee";
import type { Workspace } from "@moc/types/workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type UsersContextValue = {
  state: {
    users: UserWithRole[];
    roles: Role[];
    workspaces: Workspace[];
    isLoading: boolean;
  };
  actions: {
    loadUsers: () => Promise<void>;
    updateProfile: (userId: string, fields: { name?: string; surname?: string }) => Promise<void>;
    changeRole: (userId: string, roleId: string) => Promise<void>;
  };
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadedRef = useRef(false);
  const promiseRef = useRef<Promise<void> | null>(null);

  const { currentWorkspaceId } = useWorkspace();
  useEffect(() => {
    loadedRef.current = false;
    setUsers([]);
  }, [currentWorkspaceId]);

  const loadUsers = useCallback(async () => {
    if (loadedRef.current) return;
    if (promiseRef.current) return promiseRef.current;

    setIsLoading(true);
    promiseRef.current = Promise.all([fetchUsersWithRoles(), fetchAvailableRoles()])
      .then(async ([usersData, rolesData]) => {
        const workspaceDirectory = await fetchWorkspaceDirectory(usersData.map((user) => user.id));
        const workspaceIdsByUserId = new Map<string, string[]>();

        for (const membership of workspaceDirectory.memberships) {
          const currentWorkspaceIds = workspaceIdsByUserId.get(membership.userId) ?? [];
          currentWorkspaceIds.push(membership.workspaceId);
          workspaceIdsByUserId.set(membership.userId, currentWorkspaceIds);
        }

        setUsers(usersData.map((user) => ({
          ...user,
          workspaceIds: workspaceIdsByUserId.get(user.id) ?? [],
        })));
        setRoles(rolesData);
        setWorkspaces(workspaceDirectory.workspaces);
        loadedRef.current = true;
      })
      .finally(() => {
        promiseRef.current = null;
        setIsLoading(false);
      });

    return promiseRef.current;
  }, []);

  const updateProfile = useCallback(async (userId: string, fields: { name?: string; surname?: string }) => {
    await updateUserProfile(userId, fields);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...fields } : u)),
    );
  }, []);

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    await assignUserRole(userId, roleId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newRole = roles.find((r) => r.id === roleId) ?? null;
        return { ...u, role: newRole };
      }),
    );
  }, [roles]);

  const value = useMemo(
    () => ({
      state: { users, roles, workspaces, isLoading },
      actions: { loadUsers, updateProfile, changeRole },
    }),
    [users, roles, workspaces, isLoading, loadUsers, updateProfile, changeRole],
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
