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
 *
 * NOT used by computeHubStats below. Every writer of SessionRecord.date
 * (useTimerStore, useFlexibleStore, sessionSync) stores a UTC calendar key
 * via `toISOString().split('T')[0]`, so computeHubStats must read with that
 * same UTC contract (see toUTCDateKey) or its "today" silently disagrees
 * with what was actually stored. This helper is kept, unwired, for a future
 * migration to local-key storage — that migration needs a Dexie schema
 * migration and a Supabase backfill and is out of scope here.
 */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * UTC calendar date as YYYY-MM-DD — the exact derivation every writer of
 * SessionRecord.date uses (`toISOString().split('T')[0]`). computeHubStats
 * reads with this contract so its "today" and streak agree with how
 * sessions were actually stored, regardless of the reader's local timezone.
 */
export function toUTCDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function computeHubStats(
  sessions: SessionRecord[],
  now: Date
): HubFocusStats {
  const todayKey = toUTCDateKey(now);
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
  if (!focusDays.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streakDays = 0;
  while (focusDays.has(toUTCDateKey(cursor))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { todayMinutes, streakDays };
}
