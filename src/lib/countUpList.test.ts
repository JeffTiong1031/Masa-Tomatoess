import { describe, expect, it } from 'vitest';
import {
  TOGETHER_SEED,
  addCountUp,
  countUpRows,
  removeCountUp,
  updateCountUp,
} from './countUpList';

describe('TOGETHER_SEED', () => {
  it('seeds Together on 2025-08-09 as a normal deletable row', () => {
    expect(TOGETHER_SEED).toEqual({
      id: 'together-seed',
      label: 'Together',
      date: '2025-08-09',
    });
  });
});

describe('addCountUp', () => {
  it('appends a local entry that is not a calendar event', () => {
    const next = addCountUp([], 'Moved in', '2024-06-01', 'id-1');
    expect(next).toEqual([
      { id: 'id-1', label: 'Moved in', date: '2024-06-01' },
    ]);
    expect(next[0]).not.toHaveProperty('countdown');
    expect(next[0]).not.toHaveProperty('owner');
  });
});

describe('removeCountUp', () => {
  it('deletes the seeded row like any other', () => {
    expect(removeCountUp([TOGETHER_SEED], TOGETHER_SEED.id)).toEqual([]);
  });
});

describe('updateCountUp', () => {
  it('edits label and date in place', () => {
    const next = updateCountUp([TOGETHER_SEED], TOGETHER_SEED.id, 'Us', '2025-08-10');
    expect(next).toEqual([{ id: 'together-seed', label: 'Us', date: '2025-08-10' }]);
  });
});

describe('countUpRows', () => {
  const today = '2026-09-11';

  it('shows elapsed days for a past date', () => {
    expect(countUpRows([TOGETHER_SEED], today)[0].display).toBe('398 days');
  });

  it('shows Not yet for a future date', () => {
    const rows = countUpRows(
      [{ id: '1', label: 'Trip', date: '2026-12-01' }],
      today,
    );
    expect(rows[0].display).toBe('Not yet');
  });

  it('shows Today on the start date', () => {
    const rows = countUpRows(
      [{ id: '1', label: 'Today', date: today }],
      today,
    );
    expect(rows[0].display).toBe('Today');
  });
});
