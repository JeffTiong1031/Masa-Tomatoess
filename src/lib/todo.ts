import type { UserName } from './identity';

interface TodoBase {
  id: string;
  owner: UserName;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface OpenTodo extends TodoBase {
  done: false;
  completedAt: null;
}

export interface DoneTodo extends TodoBase {
  done: true;
  completedAt: string;
}

export type Todo = OpenTodo | DoneTodo;

export interface TodoDraft {
  owner: UserName;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
}

export type TodoGroupName =
  | 'Overdue'
  | 'Today'
  | 'Tomorrow'
  | 'This week'
  | 'Later'
  | 'No date';

export interface TodoGroup {
  name: TodoGroupName;
  todos: Todo[];
}
