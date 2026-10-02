import { describe, expect, it } from 'vitest';
import type { HandEntry } from './finance';
import { monthSpan, monthSwipe, stepMonth } from './financeMonths';

function on(date: string): HandEntry {
  return {
    id: date,
    source: 'hand',
    kind: 'expense',
    amountSen: 100,
    categoryId: 'food',
    date,
    note: null,
    createdAt: `${date}T00:00:00Z`,
  };
}

describe('the month picker range', () => {
  it('runs from the earliest entry to this month', () => {
    expect(monthSpan([on('2026-11-03'), on('2025-12-30')], '2027-02-10')).toEqual({
      first: '2025-12',
      last: '2027-02',
    });
  });

  it('is only this month when nothing is logged', () => {
    expect(monthSpan([], '2026-10-02')).toEqual({ first: '2026-10', last: '2026-10' });
  });
});

describe('stepping months', () => {
  const span = { first: '2026-11', last: '2027-02' };

  it('crosses into the next year', () => {
    expect(stepMonth('2026-12', 1, span)).toBe('2027-01');
  });

  it('crosses back into the previous year', () => {
    expect(stepMonth('2027-01', -1, span)).toBe('2026-12');
  });

  it('stays put at either end', () => {
    expect(stepMonth('2027-02', 1, span)).toBe('2027-02');
    expect(stepMonth('2026-11', -1, span)).toBe('2026-11');
  });
});

describe('swiping the month strip', () => {
  it('moves forward on a swipe left and back on a swipe right', () => {
    expect(monthSwipe(-60, 5)).toBe(1);
    expect(monthSwipe(60, -5)).toBe(-1);
  });

  it('ignores short drags and vertical scrolls', () => {
    expect(monthSwipe(-30, 0)).toBe(0);
    expect(monthSwipe(-60, 80)).toBe(0);
  });
});
