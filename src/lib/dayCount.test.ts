import { describe, expect, it } from 'vitest';
import {
  calendarDaysBetween,
  formatTrackerDays,
  msUntilNextLocalMidnight,
} from './dayCount';

describe('calendarDaysBetween', () => {
  it('returns 0 for the same calendar day', () => {
    expect(calendarDaysBetween('2026-09-11', '2026-09-11')).toBe(0);
  });

  it('returns 1 for dates one day apart', () => {
    expect(calendarDaysBetween('2026-09-11', '2026-09-12')).toBe(1);
  });

  it('returns a whole day across a US spring-forward DST boundary', () => {
    expect(calendarDaysBetween('2026-03-08', '2026-03-09')).toBe(1);
  });

  it('returns two whole days spanning the spring-forward night', () => {
    expect(calendarDaysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('returns a whole day across a US fall-back DST boundary', () => {
    expect(calendarDaysBetween('2026-11-01', '2026-11-02')).toBe(1);
  });
});

describe('formatTrackerDays countdown', () => {
  const today = '2026-09-11';

  it('shows Today when the date is today', () => {
    expect(formatTrackerDays('countdown', today, today)).toBe('Today');
  });

  it('shows Passed when the date is in the past', () => {
    expect(formatTrackerDays('countdown', '2026-09-10', today)).toBe('Passed');
  });

  it('uses the singular 1 day', () => {
    expect(formatTrackerDays('countdown', '2026-09-12', today)).toBe('1 day');
  });

  it('shows whole remaining days', () => {
    expect(formatTrackerDays('countdown', '2027-10-13', today)).toBe('397 days');
  });
});

describe('formatTrackerDays countup', () => {
  const today = '2026-09-11';

  it('shows Today when the date is today', () => {
    expect(formatTrackerDays('countup', today, today)).toBe('Today');
  });

  it('shows Not yet when the date is in the future', () => {
    expect(formatTrackerDays('countup', '2026-09-12', today)).toBe('Not yet');
  });

  it('uses the singular 1 day', () => {
    expect(formatTrackerDays('countup', '2026-09-10', today)).toBe('1 day');
  });

  it('shows whole elapsed days', () => {
    expect(formatTrackerDays('countup', '2025-08-09', today)).toBe('398 days');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('counts milliseconds to the next local midnight', () => {
    const now = new Date(2026, 8, 11, 23, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(60 * 60 * 1000);
  });

  it('returns a full day when already at local midnight', () => {
    const now = new Date(2026, 8, 11, 0, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(24 * 60 * 60 * 1000);
  });
});
