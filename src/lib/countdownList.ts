import { diffDays } from './dates';
import type { CalendarEvent } from './calendarEvent';

export interface CountdownRow {
  id: string;
  title: string;
  date: string;
  daysUntil: number;
}

export function countdownRows(
  events: CalendarEvent[],
  today: string,
): CountdownRow[] {
  return events
    .filter((event) => event.countdown && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      daysUntil: diffDays(event.date, today),
    }));
}
