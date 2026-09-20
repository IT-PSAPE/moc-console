export type Category = string;

export type RequestCategoryDefinition = {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
