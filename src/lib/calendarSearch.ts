import { sortDay, type CalendarEvent } from './calendarEvent';

export interface DateGroup {
  date: string;
  events: CalendarEvent[];
}

export function searchEvents(
  events: CalendarEvent[],
  query: string,
): CalendarEvent[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];

  return events.filter((event) => {
    const haystack = `${event.title} ${event.notes ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function groupByDate(events: CalendarEvent[]): DateGroup[] {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = byDate.get(event.date);
    if (existing) existing.push(event);
    else byDate.set(event.date, [event]);
  }

  return [...byDate.keys()]
    .sort()
    .map((date) => ({ date, events: sortDay(byDate.get(date)!) }));
}
