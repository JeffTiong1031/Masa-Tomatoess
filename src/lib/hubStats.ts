import type { SessionRecord } from '@/db/db';

export interface HubFocusStats {
  /** Focus minutes completed today. Breaks excluded. */
  todayMinutes: number;
  /** Consecutive days with at least one focus session. */
  streakDays: number;
}

/**
 * Local calendar date as YYYY-MM-DD.
 * Deliberately not toISOString() — that converts to UTC and shifts the day
 * for anyone east or west of Greenwich late in the evening.
 */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeHubStats(
  sessions: SessionRecord[],
  now: Date
): HubFocusStats {
  const todayKey = toLocalDateKey(now);
  const focusDays = new Set<string>();
  let todayMinutes = 0;

  for (const s of sessions) {
    if (s.mode !== 'focus') continue;
    focusDays.add(s.date);
    if (s.date === todayKey) todayMinutes += s.durationMinutes;
  }

  // Start from yesterday when today is still empty, so the streak isn't
  // reported as broken before the day is over.
  const cursor = new Date(now);
  if (!focusDays.has(todayKey)) cursor.setDate(cursor.getDate() - 1);

  let streakDays = 0;
  while (focusDays.has(toLocalDateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { todayMinutes, streakDays };
}
