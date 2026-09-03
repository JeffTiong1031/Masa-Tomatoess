import { describe, expect, it } from 'vitest';
import { emptyWeeks, weeksFromRows, type TimelineRow } from './timelineWeek';

const LUNCH = { time: '12-1', activity: 'Lunch' };
const HACK = { time: '3-8', activity: 'Muba hack discussion' };

describe('emptyWeeks', () => {
  it('gives both people all seven days', () => {
    const weeks = emptyWeeks();
    expect(Object.keys(weeks.Jeff)).toHaveLength(7);
    expect(Object.keys(weeks.Rachel)).toHaveLength(7);
  });

  it('gives every day an empty list, not undefined', () => {
    expect(emptyWeeks().Jeff[4]).toEqual([]);
  });
});

describe('weeksFromRows', () => {
  it('files a row under its owner and weekday', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 3, entries: [LUNCH] },
    ];
    expect(weeksFromRows(rows).Jeff[3]).toEqual([LUNCH]);
  });

  it('leaves the days a row does not cover empty', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 3, entries: [LUNCH] },
    ];
    expect(weeksFromRows(rows).Jeff[0]).toEqual([]);
  });

  it('keeps the two people apart', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 0, entries: [LUNCH] },
      { user_name: 'Rachel', weekday: 0, entries: [HACK] },
    ];
    const weeks = weeksFromRows(rows);
    expect(weeks.Jeff[0]).toEqual([LUNCH]);
    expect(weeks.Rachel[0]).toEqual([HACK]);
  });

  it('preserves free-text times exactly as typed', () => {
    const rows: TimelineRow[] = [
      {
        user_name: 'Jeff',
        weekday: 2,
        entries: [{ time: '10-letih', activity: 'Finish AI coder' }],
      },
    ];
    expect(weeksFromRows(rows).Jeff[2][0].time).toBe('10-letih');
  });

  it('returns empty weeks for no rows at all', () => {
    expect(weeksFromRows([])).toEqual(emptyWeeks());
  });
});
