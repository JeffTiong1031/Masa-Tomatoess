import { describe, expect, it } from 'vitest';
import { mealFetchRange } from './mealRange';

describe('mealFetchRange', () => {
  it('covers the whole grid of the browsed month', () => {
    expect(mealFetchRange('2026-08', '2026-08-23')).toEqual([
      '2026-07-27',
      '2026-09-06',
    ]);
  });

  it('reaches back for yesterday on the 1st of a month that starts on a Monday', () => {
    const [from, to] = mealFetchRange('2026-06', '2026-06-01');
    expect(from).toBe('2026-05-31');
    expect(to).toBe('2026-07-12');
  });

  it('still covers this week while a past month is browsed', () => {
    const [from, to] = mealFetchRange('2025-12', '2026-08-23');
    expect(from).toBe('2025-12-01');
    expect(to).toBe('2026-08-23');
  });

  it('still covers this week while a future month is browsed', () => {
    const [from, to] = mealFetchRange('2027-03', '2026-08-23');
    expect(from).toBe('2026-08-17');
    expect(to).toBe('2027-04-11');
  });

  it('never returns a range with from after to', () => {
    for (const month of ['2025-01', '2026-06', '2026-08', '2027-12']) {
      const [from, to] = mealFetchRange(month, '2026-08-23');
      expect(from <= to).toBe(true);
    }
  });
});
