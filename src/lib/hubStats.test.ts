import { describe, expect, it } from 'vitest';
import { computeHubStats, toLocalDateKey } from './hubStats';
import type { SessionRecord } from '@/db/db';

const NOW = new Date(2026, 7, 15, 14, 30); // 15 Aug 2026, local

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
      new Date(2026, 7, 1, 9, 0)
    );
    expect(stats.streakDays).toBe(2);
  });
});
