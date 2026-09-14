import { describe, expect, it } from 'vitest';
import { staleTimelineKeys } from './timelineExpiry';
import type { TimelineRow } from './timelineWeek';

const LUNCH = { time: '12-1', activity: 'Lunch' };

function row(
  partial: Pick<TimelineRow, 'user_name' | 'weekday'> & Partial<TimelineRow>,
): TimelineRow {
  return {
    entries: [LUNCH],
    ...partial,
  };
}

describe('staleTimelineKeys', () => {
  it('drops only yesterday after Malaysia midnight, for both people', () => {
    const rows: TimelineRow[] = [
      row({ user_name: 'Jeff', weekday: 0 }),
      row({ user_name: 'Rachel', weekday: 0 }),
    ];
    expect(staleTimelineKeys(rows, '2026-09-15')).toEqual([
      { user_name: 'Jeff', weekday: 0 },
      { user_name: 'Rachel', weekday: 0 },
    ]);
  });

  it('leaves today and later days', () => {
    const rows: TimelineRow[] = [
      row({ user_name: 'Jeff', weekday: 0 }),
      row({ user_name: 'Jeff', weekday: 1 }),
    ];
    expect(staleTimelineKeys(rows, '2026-09-15')).toEqual([
      { user_name: 'Jeff', weekday: 0 },
    ]);
  });

  it('does not drop Monday and Tuesday when you open on Thursday', () => {
    const rows: TimelineRow[] = [
      row({ user_name: 'Jeff', weekday: 0 }),
      row({ user_name: 'Jeff', weekday: 1 }),
      row({ user_name: 'Jeff', weekday: 2 }),
      row({ user_name: 'Rachel', weekday: 2 }),
    ];
    expect(staleTimelineKeys(rows, '2026-09-17')).toEqual([
      { user_name: 'Jeff', weekday: 2 },
      { user_name: 'Rachel', weekday: 2 },
    ]);
  });

  it('keeps a Thursday list until Thursday night has passed', () => {
    const rows: TimelineRow[] = [row({ user_name: 'Rachel', weekday: 3 })];
    expect(staleTimelineKeys(rows, '2026-09-16')).toEqual([]);
    expect(staleTimelineKeys(rows, '2026-09-17')).toEqual([]);
    expect(staleTimelineKeys(rows, '2026-09-18')).toEqual([
      { user_name: 'Rachel', weekday: 3 },
    ]);
  });

  it('skips a day that is already empty', () => {
    const rows: TimelineRow[] = [
      {
        user_name: 'Jeff',
        weekday: 0,
        entries: [],
      },
    ];
    expect(staleTimelineKeys(rows, '2026-09-15')).toEqual([]);
  });
});
