import { describe, expect, it } from 'vitest';
import { computeHubStats, toLocalDateKey, toUTCDateKey } from './hubStats';
import type { SessionRecord } from '@/db/db';

// A fixed UTC instant, not a local wall-clock time — computeHubStats reads
// SessionRecord.date as a UTC key (see toUTCDateKey), so tests exercising it
// must anchor "now" in UTC too, independent of the machine's timezone.
const NOW = new Date(Date.UTC(2026, 7, 15, 14, 30)); // 15 Aug 2026, UTC

function session(
  date: string,
  durationMinutes: number,
  mode: SessionRecord['mode'] = 'focus'
): SessionRecord {
  return { date, durationMinutes, mode, completedAt: 0 };
}

describe('toLocalDateKey', () => {
  it('formats a local date without shifting to UTC', () => {
    // 23:30 local on the 15th must stay the 15th, not roll to the 16th.
    expect(toLocalDateKey(new Date(2026, 7, 15, 23, 30))).toBe('2026-08-15');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('toUTCDateKey', () => {
  it('formats a UTC date matching the writers\' toISOString().split contract', () => {
    expect(toUTCDateKey(new Date(Date.UTC(2026, 7, 15, 23, 30)))).toBe(
      '2026-08-15'
    );
  });

  it('zero-pads single-digit months and days', () => {
    expect(toUTCDateKey(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
  });
});

describe('computeHubStats', () => {
  it('returns zeroes for an empty history', () => {
    expect(computeHubStats([], NOW)).toEqual({ todayMinutes: 0, streakDays: 0 });
  });

  it("sums today's focus minutes across multiple sessions", () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-15', 50)],
      NOW
    );
    expect(stats.todayMinutes).toBe(75);
  });

  it('ignores break sessions in both minutes and streak', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 5, 'shortBreak'), session('2026-08-15', 15, 'longBreak')],
      NOW
    );
    expect(stats).toEqual({ todayMinutes: 0, streakDays: 0 });
  });

  it('counts consecutive days ending today', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-14', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats.streakDays).toBe(3);
  });

  it('keeps the streak alive when today has no session yet', () => {
    const stats = computeHubStats(
      [session('2026-08-14', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats).toEqual({ todayMinutes: 0, streakDays: 2 });
  });

  it('breaks the streak at a gap', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats.streakDays).toBe(1);
  });

  it('reports no streak when neither today nor yesterday has a session', () => {
    const stats = computeHubStats([session('2026-08-10', 25)], NOW);
    expect(stats.streakDays).toBe(0);
  });

  it('counts a streak spanning a month boundary', () => {
    const stats = computeHubStats(
      [session('2026-08-01', 25), session('2026-07-31', 25)],
      new Date(Date.UTC(2026, 7, 1, 9, 0))
    );
    expect(stats.streakDays).toBe(2);
  });

  // Regression test for the writer/reader mismatch: every writer
  // (useTimerStore, useFlexibleStore, sessionSync) derives SessionRecord.date
  // with `new Date().toISOString().split('T')[0]` — a UTC calendar key. This
  // test builds a session the same way and feeds it through computeHubStats
  // with the identical `now`, so it fails if the reader ever drifts back to
  // a local-date comparison (which would misclassify "today" for anyone off
  // UTC, e.g. UTC+8 users near midnight local).
  it("counts a session as today when its date is derived the same way useTimerStore derives it", () => {
    // Pick an instant where UTC and a plausible local day would actually
    // differ (23:30 UTC = 07:30 the next local day at UTC+8), so this test
    // is meaningfully exercising the UTC contract rather than passing by
    // coincidence.
    const now = new Date(Date.UTC(2026, 7, 15, 23, 30));
    const dateStr = now.toISOString().split('T')[0]; // same derivation as useTimerStore
    const loggedSession: SessionRecord = {
      date: dateStr,
      durationMinutes: 30,
      mode: 'focus',
      completedAt: now.getTime(),
    };

    const stats = computeHubStats([loggedSession], now);

    expect(stats.todayMinutes).toBe(30);
    expect(stats.streakDays).toBe(1);
  });
});
