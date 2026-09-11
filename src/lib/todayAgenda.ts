import { occursOn, type CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

export type AgendaItem =
  | { kind: 'event'; id: string; title: string; chip: string }
  | { kind: 'todo'; id: string; title: string; chip: string; late: boolean };

export interface Agenda {
  items: AgendaItem[];
  hiddenCount: number;
  moreHref: string;
}

const LAST = '99:99';

function eventChip(event: CalendarEvent): string {
  return event.timing.kind === 'allDay' ? 'all day' : event.timing.startTime;
}

function eventSortKey(event: CalendarEvent): string {
  return event.timing.kind === 'allDay' ? LAST : event.timing.startTime;
}

function eventItems(events: CalendarEvent[], today: string): AgendaItem[] {
  return events
    .filter((event) => occursOn(event, today))
    .sort((a, b) => {
      const byTime = eventSortKey(a).localeCompare(eventSortKey(b));
      return byTime === 0 ? a.title.localeCompare(b.title) : byTime;
    })
    .map((event) => ({
      kind: 'event',
      id: event.id,
      title: event.title,
      chip: eventChip(event),
    }));
}

function todoItems(todos: Todo[], today: string): AgendaItem[] {
  return todos
    .filter((item) => !item.done)
    .filter((item) => item.dueDate !== null && item.dueDate <= today)
    .sort((a, b) => {
      const byDate = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
      if (byDate !== 0) return byDate;
      const byTime = (a.dueTime ?? LAST).localeCompare(b.dueTime ?? LAST);
      return byTime === 0 ? a.sortOrder - b.sortOrder : byTime;
    })
    .map((item) => {
      const late = item.dueDate !== today;
      return {
        kind: 'todo',
        id: item.id,
        title: item.title,
        chip: late ? 'Late' : 'to-do',
        late,
      };
    });
}

export function buildAgenda(
  events: CalendarEvent[],
  todos: Todo[],
  today: string,
  limit: number,
): Agenda {
  const all = [...eventItems(events, today), ...todoItems(todos, today)];
  const hidden = all.slice(limit);
  const onlyTodosHidden =
    hidden.length > 0 && hidden.every((item) => item.kind === 'todo');

  return {
    items: all.slice(0, limit),
    hiddenCount: hidden.length,
    moreHref: onlyTodosHidden ? '/timetable/todo' : '/calendar',
  };
}
