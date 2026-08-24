import { describe, expect, it } from 'vitest';
import { sealedDates, weekDates, weekStart, weekTotals } from './mealWeek';
import type { MealDay, MealEntry } from './meals';
import type { UserName } from './identity';

function day(date: string, owner: UserName, sealed: boolean): MealDay {
  return { date, owner, sealed };
}

function entry(date: string, owner: UserName, calories: number): MealEntry {
  return {
    id: `${owner}-${date}-${calories}`,
    owner,
    date,
    atTime: '12:00',
    slot: 'lunch',
    photo: null,
    dish: 'lunch',
    calories,
    source: 'typed',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

describe('weekStart', () => {
  it('returns the Monday of a midweek date', () => {
    expect(weekStart('2026-08-19')).toBe('2026-08-17');
  });

  it('returns a Monday unchanged', () => {
    expect(weekStart('2026-08-17')).toBe('2026-08-17');
  });

  it('sends Sunday back six days, not forward one', () => {
    expect(weekStart('2026-08-23')).toBe('2026-08-17');
  });
});

describe('weekDates', () => {
  it('returns seven consecutive days from Monday', () => {
    expect(weekDates('2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
  });
});

describe('sealedDates', () => {
  const week = weekDates('2026-08-17');
  const days = [
    day('2026-08-17', 'Jeff', true),
    day('2026-08-18', 'Jeff', false),
    day('2026-08-19', 'Jeff', true),
    day('2026-08-19', 'Rachel', true),
    day('2026-08-20', 'Rachel', true),
  ];

  it('returns sealed days for one owner only', () => {
    expect(sealedDates(days, week, 'Jeff')).toEqual(['2026-08-17', '2026-08-19']);
  });

  it('keeps the two people separate', () => {
    expect(sealedDates(days, week, 'Rachel')).toEqual(['2026-08-19', '2026-08-20']);
  });

  it('ignores sealed days outside the week', () => {
    const outside = [...days, day('2026-08-10', 'Jeff', true)];
    expect(sealedDates(outside, week, 'Jeff')).toEqual(['2026-08-17', '2026-08-19']);
  });
});

describe('weekTotals', () => {
  const entries = [
    entry('2026-08-17', 'Jeff', 500),
    entry('2026-08-17', 'Jeff', 600),
    entry('2026-08-18', 'Jeff', 900),
    entry('2026-08-19', 'Jeff', 700),
    entry('2026-08-17', 'Rachel', 400),
  ];

  it('adds up every date it is given', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-19'], 'Jeff');
    expect(totals.total).toBe(1800);
  });

  it('leaves out a date it was not given', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-19'], 'Jeff');
    expect(totals.byDate['2026-08-18']).toBeUndefined();
  });

  it('counts a day the moment it has a meal, with nothing to mark finished', () => {
    const week = weekDates('2026-08-17');
    const totals = weekTotals(entries, week, 'Jeff');
    expect(totals.total).toBe(2700);
    expect(totals.dayCount).toBe(3);
  });

  it('does not count an empty day towards the day count', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-21'], 'Jeff');
    expect(totals.dayCount).toBe(1);
  });

  it('excludes the other person', () => {
    const totals = weekTotals(entries, ['2026-08-17'], 'Rachel');
    expect(totals.total).toBe(400);
  });

  it('gives a day with no meals a zero rather than a gap, so its bar draws', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-21'], 'Jeff');
    expect(totals.byDate['2026-08-21']).toBe(0);
  });

  it('is empty when given no dates', () => {
    const totals = weekTotals(entries, [], 'Jeff');
    expect(totals).toEqual({ byDate: {}, total: 0, dayCount: 0 });
  });
});
