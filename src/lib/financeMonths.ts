import { addMonths, monthOf } from './dates';
import type { Entry } from './finance';

export interface MonthSpan {
  first: string;
  last: string;
}

export function monthSpan(entries: Entry[], today: string): MonthSpan {
  const last = monthOf(today);
  const first = entries.reduce(
    (earliest, entry) => (monthOf(entry.date) < earliest ? monthOf(entry.date) : earliest),
    last,
  );
  return { first, last };
}

export function stepMonth(month: string, delta: number, span: MonthSpan): string {
  const next = addMonths(month, delta);
  if (next < span.first) return span.first;
  if (next > span.last) return span.last;
  return next;
}

const MONTH_SWIPE_PX = 40;

export function monthSwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < MONTH_SWIPE_PX) return 0;
  return dx < 0 ? 1 : -1;
}
