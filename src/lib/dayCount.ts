import { diffDays } from './dates';

export type TrackerMode = 'countdown' | 'countup';

export function calendarDaysBetween(from: string, to: string): number {
  return diffDays(to, from);
}

export function formatTrackerDays(
  mode: TrackerMode,
  date: string,
  today: string,
): string {
  const delta = calendarDaysBetween(today, date);

  if (delta === 0) return 'Today';

  if (mode === 'countdown') {
    if (delta < 0) return 'Passed';
    return delta === 1 ? '1 day' : `${delta} days`;
  }

  if (delta > 0) return 'Not yet';
  const elapsed = -delta;
  return elapsed === 1 ? '1 day' : `${elapsed} days`;
}

export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
