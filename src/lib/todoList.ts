import { addDays, todayISO, weekdayIndex } from './dates';
import type { DoneTodo, Todo, TodoGroup, TodoGroupName } from './todo';

const GROUP_ORDER: TodoGroupName[] = [
  'Overdue',
  'Today',
  'Tomorrow',
  'This week',
  'Later',
  'No date',
];

export const SORT_ORDER_GAP = 100;

export function weekEnd(date: string): string {
  return addDays(date, 6 - weekdayIndex(date));
}

export function groupOf(todo: Todo, today: string, now: string): TodoGroupName {
  if (todo.dueDate === null) return 'No date';
  if (todo.dueDate < today) return 'Overdue';
  if (todo.dueDate === today) {
    if (todo.dueTime === null) return 'Today';
    return `${todo.dueTime}:00` < now ? 'Overdue' : 'Today';
  }
  if (todo.dueDate === addDays(today, 1)) return 'Tomorrow';
  if (todo.dueDate <= weekEnd(today)) return 'This week';
  return 'Later';
}

export function compareTodos(a: Todo, b: Todo): number {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

export function groupTodos(
  todos: Todo[],
  today: string,
  now: string,
): TodoGroup[] {
  const buckets: Record<TodoGroupName, Todo[]> = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    'This week': [],
    Later: [],
    'No date': [],
  };

  for (const todo of todos) {
    if (todo.done) continue;
    buckets[groupOf(todo, today, now)].push(todo);
  }

  return GROUP_ORDER.map((name) => ({
    name,
    todos: buckets[name].sort(compareTodos),
  })).filter((group) => group.todos.length > 0);
}

export function reorderInGroup(todos: Todo[], activeId: string, overId: string): string[] {
  const ids = todos.map((todo) => todo.id);
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;

  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function clampReorderInGroup(
  todos: Todo[],
  activeId: string,
  overId: string,
): string[] {
  const from = todos.findIndex((todo) => todo.id === activeId);
  const to = todos.findIndex((todo) => todo.id === overId);
  if (from === -1 || to === -1 || from === to) {
    return todos.map((todo) => todo.id);
  }

  const priorityCount = todos.filter((todo) => todo.priority).length;
  const clampedTo = todos[from].priority
    ? Math.min(to, priorityCount - 1)
    : Math.max(to, priorityCount);

  return reorderInGroup(todos, activeId, todos[clampedTo].id);
}

export function placeInPriorityFence(
  groupTodos: Todo[],
  id: string,
  priority: boolean,
): string[] {
  void priority;
  const others = groupTodos.filter((todo) => todo.id !== id);
  const flagged = others.filter((todo) => todo.priority).map((todo) => todo.id);
  const unflagged = others.filter((todo) => !todo.priority).map((todo) => todo.id);
  return [...flagged, id, ...unflagged];
}

export function sortOrdersForOrder(
  ids: string[],
  startAt = SORT_ORDER_GAP,
): { id: string; sortOrder: number }[] {
  return ids.map((id, index) => ({
    id,
    sortOrder: startAt + index * SORT_ORDER_GAP,
  }));
}

const COMPLETED_WINDOW_DAYS = 7;

export function completedTodos(todos: Todo[], today: string): DoneTodo[] {
  const from = addDays(today, -(COMPLETED_WINDOW_DAYS - 1));
  return todos
    .filter((todo): todo is DoneTodo => todo.done)
    .filter((todo) => todayISO(new Date(todo.completedAt)) >= from)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function nextOverdueAt(
  todos: Todo[],
  today: string,
  now: string,
): string | null {
  const upcoming: string[] = [];
  for (const todo of todos) {
    if (todo.done || todo.dueDate !== today || todo.dueTime === null) continue;
    const at = `${todo.dueTime}:00`;
    if (at > now) upcoming.push(at);
  }
  return upcoming.sort()[0] ?? null;
}

export function msUntil(date: string, time: string, from: Date): number {
  return new Date(`${date}T${time}`).getTime() - from.getTime();
}

export const OVERDUE_WAKE_SLACK_MS = 1050;

export function nextWakeDelayMs(
  todos: Todo[],
  today: string,
  now: string,
  from: Date,
): number {
  const overdueAt = nextOverdueAt(todos, today, now);
  const overdueDelay =
    overdueAt === null
      ? null
      : Math.max(msUntil(today, overdueAt, from) + OVERDUE_WAKE_SLACK_MS, 0);

  const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  const midnightDelay = Math.max(midnight.getTime() - from.getTime() + OVERDUE_WAKE_SLACK_MS, 0);

  return overdueDelay === null ? midnightDelay : Math.min(overdueDelay, midnightDelay);
}
