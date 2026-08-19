import { addDays, weekdayIndex } from './dates';
import { occursOn, type CalendarEvent } from './calendarEvent';
import type { UserName } from './identity';

const DAYS_IN_WEEK = 7;
const MAX_DOTS = 3;

export type OwnerFilter = UserName | 'both';

export interface ViewFilters {
  owner: OwnerFilter;
  categoryIds: string[];
}

export function weekDates(date: string): string[] {
  const monday = addDays(date, -weekdayIndex(date));
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) =>
    addDays(monday, index),
  );
}

export function countsByDate(
  events: CalendarEvent[],
  dates: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const date of dates) {
    counts[date] = events.filter((event) => occursOn(event, date)).length;
  }
  return counts;
}

export function monthDots(count: number): number {
  return Math.min(count, MAX_DOTS);
}

export function applyFilters(
  events: CalendarEvent[],
  filters: ViewFilters,
): CalendarEvent[] {
  return events.filter((event) => {
    if (filters.owner !== 'both' && event.owner !== filters.owner) return false;
    if (filters.categoryIds.length === 0) return true;
    return (
      event.categoryId !== null &&
      filters.categoryIds.includes(event.categoryId)
    );
  });
}
