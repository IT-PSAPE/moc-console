export type Role = {
  id: string;
  name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage_roles: boolean;
};

export type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegramChatId: string | null;
};

export type RequestAssignee = {
  requestId: string;
  userId: string;
  duty: string;
};
