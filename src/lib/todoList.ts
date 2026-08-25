import { addDays, weekdayIndex } from './dates';
import type { DoneTodo, Todo, TodoGroup, TodoGroupName } from './todo';

const GROUP_ORDER: TodoGroupName[] = [
  'Overdue',
  'Today',
  'Tomorrow',
  'This week',
  'Later',
  'No date',
];

const AFTER_EVERY_DATE = '9999-12-31';
const AFTER_EVERY_TIME = '99:99';

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
  const dateA = a.dueDate ?? AFTER_EVERY_DATE;
  const dateB = b.dueDate ?? AFTER_EVERY_DATE;
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;

  if (a.priority !== b.priority) return a.priority ? -1 : 1;

  const timeA = a.dueTime ?? AFTER_EVERY_TIME;
  const timeB = b.dueTime ?? AFTER_EVERY_TIME;
  if (timeA !== timeB) return timeA < timeB ? -1 : 1;

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

const COMPLETED_WINDOW_DAYS = 7;

export function completedTodos(todos: Todo[], today: string): DoneTodo[] {
  const from = addDays(today, -(COMPLETED_WINDOW_DAYS - 1));
  return todos
    .filter((todo): todo is DoneTodo => todo.done)
    .filter((todo) => todo.completedAt.slice(0, 10) >= from)
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
