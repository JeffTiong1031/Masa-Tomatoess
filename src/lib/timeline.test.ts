import { describe, expect, it } from 'vitest';
import { normalizeEntries } from './timeline';

describe('normalizeEntries', () => {
  it('trims whitespace from both fields', () => {
    expect(
      normalizeEntries([{ time: '  09:00-11:00 ', activity: ' Lectures  ' }]),
    ).toEqual([{ time: '09:00-11:00', activity: 'Lectures' }]);
  });

  it('drops rows whose activity is empty after trimming', () => {
    expect(
      normalizeEntries([
        { time: '09:00', activity: '' },
        { time: '10:00', activity: '   ' },
        { time: '', activity: '' },
      ]),
    ).toEqual([]);
  });

  it('keeps a row that has an activity but no time', () => {
    expect(normalizeEntries([{ time: '   ', activity: 'Gym' }])).toEqual([
      { time: '', activity: 'Gym' },
    ]);
  });

  it('preserves the order the rows were typed in', () => {
    expect(
      normalizeEntries([
        { time: 'evening', activity: 'Dinner' },
        { time: '09:00', activity: 'Lectures' },
        { time: 'after lunch', activity: 'Lab' },
      ]),
    ).toEqual([
      { time: 'evening', activity: 'Dinner' },
      { time: '09:00', activity: 'Lectures' },
      { time: 'after lunch', activity: 'Lab' },
    ]);
  });

  it('returns an empty list for an empty draft', () => {
    expect(normalizeEntries([])).toEqual([]);
  });
});
