import { describe, expect, it } from 'vitest';
import {
  confidenceFor,
  cycleGaps,
  cycleLength,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  median,
  periodLength,
  sortLogs,
  type PeriodLog,
} from './cycle';

function log(id: string, startDate: string, endDate: string | null = null): PeriodLog {
  return { id, startDate, endDate };
}

describe('sortLogs', () => {
  it('puts the newest start first', () => {
    const sorted = sortLogs([
      log('a', '2026-06-01'),
      log('c', '2026-08-01'),
      log('b', '2026-07-01'),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate its input', () => {
    const input = [log('a', '2026-06-01'), log('b', '2026-08-01')];
    sortLogs(input);
    expect(input.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('median', () => {
  it('takes the middle of an odd count', () => {
    expect(median([29, 27, 31])).toBe(29);
  });

  it('averages the two middle values of an even count', () => {
    expect(median([28, 30])).toBe(29);
  });

  it('rounds a half upward', () => {
    expect(median([28, 29])).toBe(29);
  });

  it('ignores the order it is given', () => {
    expect(median([40, 21, 28, 29, 30])).toBe(29);
  });
});

describe('cycleGaps', () => {
  it('is empty with fewer than two logs', () => {
    expect(cycleGaps([])).toEqual([]);
    expect(cycleGaps([log('a', '2026-08-01')])).toEqual([]);
  });

  it('measures start-to-start, newest first', () => {
    expect(
      cycleGaps([
        log('a', '2026-06-01'),
        log('b', '2026-06-30'),
        log('c', '2026-07-28'),
      ]),
    ).toEqual([28, 29]);
  });

  it('discards a gap from a forgotten log', () => {
    expect(
      cycleGaps([log('a', '2026-06-01'), log('b', '2026-08-28')]),
    ).toEqual([]);
  });

  it('discards a gap from a double log', () => {
    expect(
      cycleGaps([log('a', '2026-08-01'), log('b', '2026-08-04')]),
    ).toEqual([]);
  });

  it('keeps gaps at the edges of the accepted window', () => {
    expect(
      cycleGaps([
        log('a', '2026-01-01'),
        log('b', '2026-01-16'),
        log('c', '2026-03-17'),
      ]),
    ).toEqual([60, 15]);
  });
});

describe('cycleLength', () => {
  it('falls back to 28 with no history', () => {
    expect(cycleLength([])).toBe(DEFAULT_CYCLE_LENGTH);
  });

  it('falls back to 28 with one period logged', () => {
    expect(cycleLength([log('a', '2026-08-01')])).toBe(28);
  });

  it('uses the single gap when only one exists', () => {
    expect(
      cycleLength([log('a', '2026-07-01'), log('b', '2026-08-01')]),
    ).toBe(31);
  });

  it('ignores one forgotten log among good history', () => {
    const logs = [
      log('a', '2026-01-01'),
      log('b', '2026-01-30'),
      log('c', '2026-02-28'),
      log('d', '2026-04-27'),
      log('e', '2026-05-26'),
      log('f', '2026-06-24'),
    ];
    expect(cycleLength(logs)).toBe(29);
  });

  it('reads only the most recent six gaps', () => {
    const logs = [log('old', '2020-01-01'), log('old2', '2020-04-01')];
    let date = '2026-01-01';
    for (let i = 0; i < 7; i += 1) {
      logs.push(log(`n${i}`, date));
      date = `2026-0${i + 2}-01`.slice(0, 10);
    }
    expect(cycleGaps(logs).length).toBeLessThanOrEqual(6);
  });
});

describe('periodLength', () => {
  it('falls back to 5 with no finished periods', () => {
    expect(periodLength([])).toBe(DEFAULT_PERIOD_LENGTH);
    expect(periodLength([log('a', '2026-08-01')])).toBe(5);
  });

  it('counts both endpoints', () => {
    expect(periodLength([log('a', '2026-08-01', '2026-08-05')])).toBe(5);
  });

  it('ignores an open period', () => {
    expect(
      periodLength([
        log('a', '2026-07-01', '2026-07-04'),
        log('b', '2026-08-01'),
      ]),
    ).toBe(4);
  });

  it('discards an implausible length', () => {
    expect(
      periodLength([
        log('a', '2026-06-01', '2026-06-25'),
        log('b', '2026-07-01', '2026-07-06'),
      ]),
    ).toBe(6);
  });
});

describe('confidenceFor', () => {
  it('is none with no logs', () => {
    expect(confidenceFor([])).toBe('none');
  });

  it('is default with one log and therefore no gap', () => {
    expect(confidenceFor([log('a', '2026-08-01')])).toBe('default');
  });

  it('is thin with exactly one usable gap', () => {
    expect(
      confidenceFor([log('a', '2026-07-01'), log('b', '2026-08-01')]),
    ).toBe('thin');
  });

  it('is learned with two or more usable gaps', () => {
    expect(
      confidenceFor([
        log('a', '2026-06-01'),
        log('b', '2026-07-01'),
        log('c', '2026-08-01'),
      ]),
    ).toBe('learned');
  });

  it('is default when every gap was discarded', () => {
    expect(
      confidenceFor([log('a', '2026-01-01'), log('b', '2026-08-01')]),
    ).toBe('default');
  });
});
