import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  monthGridDates,
  monthOf,
  timeISO,
  todayISO,
  todayWeekday,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  weekdayIndex,
} from './dates';

describe('todayISO', () => {
  it('reads local calendar parts, not a UTC timestamp', () => {
    expect(todayISO(new Date(2026, 7, 16, 1, 30))).toBe('2026-08-16');
  });

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('timeISO', () => {
  it('reads the local wall clock as HH:MM:SS', () => {
    expect(timeISO(new Date(2026, 7, 26, 9, 5, 3))).toBe('09:05:03');
  });
});

describe('addDays', () => {
  it('moves forward within a month', () => {
    expect(addDays('2026-08-16', 7)).toBe('2026-08-23');
  });

  it('moves backward across a month boundary', () => {
    expect(addDays('2026-08-02', -5)).toBe('2026-07-28');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('returns the same date for zero', () => {
    expect(addDays('2026-08-16', 0)).toBe('2026-08-16');
  });
});

describe('diffDays', () => {
  it('counts whole days between two dates', () => {
    expect(diffDays('2026-08-23', '2026-08-16')).toBe(7);
  });

  it('returns a negative count when the first date is earlier', () => {
    expect(diffDays('2026-08-16', '2026-08-23')).toBe(-7);
  });

  it('counts across a leap year', () => {
    expect(diffDays('2028-03-01', '2028-02-28')).toBe(2);
  });
});

describe('monthOf and addMonths', () => {
  it('extracts the month key', () => {
    expect(monthOf('2026-08-16')).toBe('2026-08');
  });

  it('steps forward across a year boundary', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
  });

  it('steps backward across a year boundary', () => {
    expect(addMonths('2026-02', -3)).toBe('2025-11');
  });
});

describe('monthGridDates', () => {
  it('returns six Monday-first weeks', () => {
    const grid = monthGridDates('2026-08');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-07-27');
    expect(grid[41]).toBe('2026-09-06');
  });

  it('starts on the first of the month when the first is a Monday', () => {
    expect(monthGridDates('2026-06')[0]).toBe('2026-06-01');
  });

  it('is contiguous', () => {
    const grid = monthGridDates('2026-08');
    for (let i = 1; i < grid.length; i += 1) {
      expect(diffDays(grid[i], grid[i - 1])).toBe(1);
    }
  });
});

describe('formatting', () => {
  it('names the month and year', () => {
    expect(formatMonthYear('2026-08')).toBe('August 2026');
  });

  it('formats a short date without a leading zero', () => {
    expect(formatShortDate('2026-07-05')).toBe('5 Jul');
  });

  it('formats a long date with its weekday', () => {
    expect(formatLongDate('2026-08-23')).toBe('Sun 23 Aug');
  });

  it('lists weekdays Monday first', () => {
    expect(WEEKDAYS_SHORT[0]).toBe('Mon');
    expect(WEEKDAYS_SHORT[6]).toBe('Sun');
  });
});

describe('todayWeekday', () => {
  it('makes Monday 0, not 1', () => {
    expect(todayWeekday(new Date(2026, 8, 7))).toBe(0);
  });

  it('makes Sunday 6, not 0', () => {
    expect(todayWeekday(new Date(2026, 8, 13))).toBe(6);
  });

  it('agrees with weekdayIndex for the same day', () => {
    expect(todayWeekday(new Date(2026, 8, 3))).toBe(weekdayIndex('2026-09-03'));
  });

  it('reads local parts, so a late evening does not roll forward', () => {
    expect(todayWeekday(new Date(2026, 8, 7, 23, 30))).toBe(0);
  });
});

describe('WEEKDAYS', () => {
  it('lines up with WEEKDAYS_SHORT', () => {
    expect(WEEKDAYS).toHaveLength(WEEKDAYS_SHORT.length);
    WEEKDAYS.forEach((name, index) => {
      expect(name.startsWith(WEEKDAYS_SHORT[index])).toBe(true);
    });
  });
});
