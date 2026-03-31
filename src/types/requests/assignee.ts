export type Assignee = {
  id: string;
  name: string;
  surname: string;
  role: string;
};

export type RequestAssignee = {
  requestId: string;
  assigneeId: string;
  duty: string;
};
