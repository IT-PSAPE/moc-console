export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type WorkspaceMembership = {
  workspaceId: string;
  userId: string;
};
