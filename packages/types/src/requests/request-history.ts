export type RequestHistoryActor = {
  id: string;
  name: string;
  surname: string;
  avatarUrl: string | null;
};

export type RequestActivityType = "created" | "updated" | "title_updated" | "status_changed";

export type RequestActivity = {
  id: string;
  requestId: string;
  type: RequestActivityType;
  details: Record<string, unknown>;
  actor: RequestHistoryActor | null;
  createdAt: string;
};

export type RequestComment = {
  id: string;
  requestId: string;
  body: string;
  actor: RequestHistoryActor | null;
  createdAt: string;
};
