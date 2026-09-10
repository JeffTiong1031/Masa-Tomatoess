import type { CalendarEvent } from './calendarEvent';
import { formatTrackerDays } from './dayCount';

export interface CountdownRow {
  id: string;
  title: string;
  date: string;
  display: string;
}

export function countdownRows(
  events: CalendarEvent[],
  today: string,
): CountdownRow[] {
  return events
    .filter((event) => event.countdown)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      display: formatTrackerDays('countdown', event.date, today),
    }));
}
