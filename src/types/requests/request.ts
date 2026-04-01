import type { Priority } from "./priority";
import type { Status } from "./status";
import type { Category } from "./category";

export type Request = {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  category: Category;
  createdAt: string;
  dueDate: string | null;
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  how: string;
  notes?: string;
  flow?: string;
  content?: string;
};
