export type Assignee = {
  id: string;
  name: string;
  surname: string;
};

export type RequestAssignee = {
  requestId: string;
  assigneeId: string;
  duty: string;
};
