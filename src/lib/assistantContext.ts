import { WEEKDAYS_SHORT, weekdayIndex } from './dates';
import { completedTodos } from './todoList';
import type { Todo } from './todo';

export interface HandleMap {
  prefix: string;
  byId: Record<string, string>;
  byHandle: Record<string, string>;
  next: number;
}

export function emptyHandleMap(prefix: string): HandleMap {
  return { prefix, byId: {}, byHandle: {}, next: 1 };
}

export function assignHandles(map: HandleMap, ids: string[]): HandleMap {
  const byId = { ...map.byId };
  const byHandle = { ...map.byHandle };
  let next = map.next;

  for (const id of ids) {
    if (byId[id] !== undefined) continue;
    const handle = `${map.prefix}${next}`;
    byId[id] = handle;
    byHandle[handle] = id;
    next += 1;
  }

  return { prefix: map.prefix, byId, byHandle, next };
}

export function handleOf(map: HandleMap, id: string): string | null {
  return Object.prototype.hasOwnProperty.call(map.byId, id) ? map.byId[id] : null;
}

export function idOf(map: HandleMap, handle: string): string | null {
  return Object.prototype.hasOwnProperty.call(map.byHandle, handle) ? map.byHandle[handle] : null;
}

export const MAX_TODO_ROWS = 200;

export interface TodoSnapshotRow {
  handle: string;
  title: string;
  dueDate: string;
  dueTime: string;
  priority: boolean;
  done: boolean;
}

export interface TodoSnapshot {
  today: string;
  weekday: string;
  now: string;
  rows: TodoSnapshotRow[];
}

export function buildTodoSnapshot(
  rows: Todo[],
  map: HandleMap,
  today: string,
  now: string,
): { snapshot: TodoSnapshot; map: HandleMap } {
  const openRows = rows.filter((row) => !row.done);
  const doneRows = completedTodos(rows, today);
  const sent = [...openRows, ...doneRows].slice(0, MAX_TODO_ROWS);

  const nextMap = assignHandles(map, sent.map((row) => row.id));

  return {
    snapshot: {
      today,
      weekday: WEEKDAYS_SHORT[weekdayIndex(today)],
      now,
      rows: sent.map((row) => ({
        handle: handleOf(nextMap, row.id) as string,
        title: row.title,
        dueDate: row.dueDate ?? '',
        dueTime: row.dueTime ?? '',
        priority: row.priority,
        done: row.done,
      })),
    },
    map: nextMap,
  };
}
