export type AppRole = "admin" | "editor" | "viewer";

export type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
};

export type RequestAssignee = {
  requestId: string;
  userId: string;
  duty: string;
};
