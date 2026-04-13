export type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export type WorkspaceMembership = {
  workspaceId: string;
  userId: string;
};
