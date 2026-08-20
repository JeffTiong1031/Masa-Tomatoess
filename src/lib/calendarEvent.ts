import type { UserName } from './identity';

export type EventTiming =
  | { kind: 'allDay'; endDate: string | null }
  | { kind: 'moment'; startTime: string }
  | { kind: 'span'; startTime: string; endTime: string };

export interface CalendarEvent {
  id: string;
  owner: UserName;
  title: string;
  date: string;
  timing: EventTiming;
  notes: string | null;
  countdown: boolean;
  categoryId: string | null;
}

const MIN_SPAN_HOURS = 3;
const HOURS_IN_DAY = 24;

function startKey(timing: EventTiming): string {
  return timing.kind === 'allDay' ? '' : timing.startTime;
}

function hourOf(time: string): number {
  return Number(time.slice(0, 2));
}

function endHourOf(timing: EventTiming): number {
  if (timing.kind === 'moment') return hourOf(timing.startTime) + 1;
  if (timing.kind === 'span') {
    return hourOf(timing.endTime) + 1;
  }
  return 0;
}

export function sortDay(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byStart = startKey(a.timing).localeCompare(startKey(b.timing));
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function occursOn(event: CalendarEvent, date: string): boolean {
  if (event.timing.kind !== 'allDay' || event.timing.endDate === null) {
    return event.date === date;
  }
  return date >= event.date && date <= event.timing.endDate;
}

export function timelineHours(
  events: CalendarEvent[],
): { from: number; to: number } {
  const timed = events.filter((event) => event.timing.kind !== 'allDay');
  
  let from = 8;
  let to = 24;

  if (timed.length > 0) {
    const starts = timed.map((event) => hourOf(startKey(event.timing)));
    const ends = timed.map((event) => endHourOf(event.timing));
    from = Math.min(from, ...starts);
    to = Math.max(to, ...ends);
  }

  return { from, to };
}
