const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** How long ago a note was touched, in the words you would use out loud.
 *  Counted in calendar days once past an hour, so a note written at 11pm
 *  reads as "yesterday" in the morning rather than "13 hours ago". */
export function whenTouched(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  const elapsed = nowMs - then;

  if (elapsed < MINUTE_MS) return 'Just now';
  if (elapsed < HOUR_MS) {
    const minutes = Math.floor(elapsed / MINUTE_MS);
    return `${minutes} min ago`;
  }

  const days = calendarDaysBetween(then, nowMs);
  if (days <= 0) {
    const hours = Math.max(1, Math.floor(elapsed / HOUR_MS));
    return hours === 1 ? 'An hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? 'A month ago' : `${months} months ago`;
  }
  return 'Over a year ago';
}

function calendarDaysBetween(thenMs: number, nowMs: number): number {
  const startOfDay = (ms: number) => {
    const date = new Date(ms);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  return Math.round((startOfDay(nowMs) - startOfDay(thenMs)) / DAY_MS);
}
