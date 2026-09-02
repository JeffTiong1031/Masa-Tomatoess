import { WEEKDAYS_SHORT, addDays, weekdayIndex } from './dates';
import { completedTodos } from './todoList';
import type { Todo } from './todo';
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { Category } from './categories';
import type { UserName } from './identity';

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

export const MAX_EVENT_ROWS = 250;
export const MAX_NOTE_CHARS = 200;
export const WIDE_BACK = 30;
export const WIDE_AHEAD = 90;
export const NARROW_BACK = 14;
export const NARROW_AHEAD = 45;

export interface CalendarSnapshotRow {
  handle: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  countdown: boolean;
  category: string;
  notes: string;
}

export interface CalendarSnapshot {
  today: string;
  weekday: string;
  now: string;
  from: string;
  to: string;
  categories: string[];
  rows: CalendarSnapshotRow[];
}

interface Bounds {
  from: string;
  to: string;
}

function lastDayOf(event: CalendarEvent): string {
  const { timing } = event;
  if (timing.kind === 'allDay' && timing.endDate !== null) return timing.endDate;
  return event.date;
}

function startKeyOf(timing: EventTiming): string {
  return timing.kind === 'allDay' ? '' : timing.startTime;
}

function within(event: CalendarEvent, window: Bounds): boolean {
  return event.date <= window.to && lastDayOf(event) >= window.from;
}

function ordered(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const byStart = startKeyOf(a.timing).localeCompare(startKeyOf(b.timing));
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function buildCalendarSnapshot(
  rows: CalendarEvent[],
  categories: Category[],
  owner: UserName,
  map: HandleMap,
  today: string,
  now: string,
): { snapshot: CalendarSnapshot; map: HandleMap } {
  const mine = ordered(rows.filter((event) => event.owner === owner));

  const wide: Bounds = { from: addDays(today, -WIDE_BACK), to: addDays(today, WIDE_AHEAD) };
  const narrow: Bounds = { from: addDays(today, -NARROW_BACK), to: addDays(today, NARROW_AHEAD) };

  const inWide = mine.filter((event) => within(event, wide));
  const window = inWide.length > MAX_EVENT_ROWS ? narrow : wide;
  const chosen = inWide.length > MAX_EVENT_ROWS ? mine.filter((event) => within(event, narrow)) : inWide;

  const sent = chosen.slice(0, MAX_EVENT_ROWS);
  const to = sent.length < chosen.length ? sent[sent.length - 1].date : window.to;

  const nextMap = assignHandles(map, sent.map((event) => event.id));
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return {
    snapshot: {
      today,
      weekday: WEEKDAYS_SHORT[weekdayIndex(today)],
      now,
      from: window.from,
      to,
      categories: categories.map((category) => category.name),
      rows: sent.map((event) => {
        const { timing } = event;
        return {
          handle: handleOf(nextMap, event.id) as string,
          title: event.title,
          date: event.date,
          endDate: timing.kind === 'allDay' ? (timing.endDate ?? '') : '',
          startTime: startKeyOf(timing),
          endTime: timing.kind === 'span' ? timing.endTime : '',
          countdown: event.countdown,
          category: event.categoryId === null ? '' : (nameById.get(event.categoryId) ?? ''),
          notes: (event.notes ?? '').slice(0, MAX_NOTE_CHARS),
        };
      }),
    },
    map: nextMap,
  };
}
