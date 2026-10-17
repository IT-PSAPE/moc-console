import type { Status } from "./status.js";
import type { Category } from "./category.js";

export type Request = {
  id: string;
  title: string;
  status: Status;
  category: Category;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  requestedBy: string;
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
