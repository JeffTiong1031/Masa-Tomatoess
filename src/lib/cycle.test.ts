import { describe, expect, it } from 'vitest';
import { addDays } from './cycleDates';
import {
  confidenceFor,
  cycleGaps,
  cycleLength,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  hubCycleLabel,
  median,
  periodLength,
  phaseForDay,
  sortLogs,
  summarizeCycle,
  type PeriodLog,
  VALIDATION_MESSAGES,
  validateEnd,
  validateStart,
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

describe('phaseForDay', () => {
  it('names the four phases of a 28-day cycle with a 5-day period', () => {
    const at = (day: number) => phaseForDay(day, 28, 5);
    expect(at(1)).toBe('menstrual');
    expect(at(5)).toBe('menstrual');
    expect(at(6)).toBe('follicular');
    expect(at(10)).toBe('follicular');
    expect(at(11)).toBe('fertile');
    expect(at(15)).toBe('fertile');
    expect(at(16)).toBe('luteal');
    expect(at(28)).toBe('luteal');
  });

  it('pushes ovulation later on a long cycle instead of pinning it to day 14', () => {
    expect(phaseForDay(14, 35, 5)).toBe('follicular');
    expect(phaseForDay(21, 35, 5)).toBe('fertile');
  });

  it('pulls ovulation earlier on a short cycle', () => {
    expect(phaseForDay(7, 21, 5)).toBe('fertile');
    expect(phaseForDay(14, 21, 5)).toBe('luteal');
  });

  it('lets the period win when the bands would collide', () => {
    expect(phaseForDay(6, 21, 6)).toBe('menstrual');
    expect(phaseForDay(7, 21, 6)).toBe('fertile');
  });

  it('never overlaps the fertile band with the bleed', () => {
    for (let cycleLen = 15; cycleLen <= 60; cycleLen += 1) {
      for (let periodLen = 1; periodLen <= 14; periodLen += 1) {
        for (let day = 1; day <= periodLen; day += 1) {
          expect(phaseForDay(day, cycleLen, periodLen)).toBe('menstrual');
        }
      }
    }
  });

  it('returns luteal for a day past the end of the cycle', () => {
    expect(phaseForDay(40, 28, 5)).toBe('luteal');
  });

  it('always returns one of the four phases', () => {
    const known = new Set(['menstrual', 'follicular', 'fertile', 'luteal']);
    for (let cycleLen = 15; cycleLen <= 60; cycleLen += 1) {
      for (let day = 1; day <= cycleLen + 10; day += 1) {
        expect(known.has(phaseForDay(day, cycleLen, 5))).toBe(true);
      }
    }
  });
});

describe('summarizeCycle', () => {
  it('reports no data when nothing is logged', () => {
    const summary = summarizeCycle([], '2026-08-16');
    expect(summary.headline).toEqual({ kind: 'no-data' });
    expect(summary.phase).toBeNull();
    expect(summary.dayOfCycle).toBeNull();
    expect(summary.nextStart).toBeNull();
    expect(summary.confidence).toBe('none');
  });

  it('counts days to the next period', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    const summary = summarizeCycle(logs, '2026-08-16');
    expect(summary.cycleLength).toBe(28);
    expect(summary.nextStart).toBe('2026-08-22');
    expect(summary.headline).toEqual({ kind: 'upcoming', days: 6 });
    expect(summary.dayOfCycle).toBe(23);
    expect(summary.phase).toBe('luteal');
  });

  it('says due today on the predicted day', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    expect(summarizeCycle(logs, '2026-08-22').headline).toEqual({ kind: 'due-today' });
  });

  it('reports lateness as a positive count, never a negative countdown', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    expect(summarizeCycle(logs, '2026-08-25').headline).toEqual({ kind: 'late', days: 3 });
  });

  it('never produces a negative day count on any date', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    let date = '2026-07-25';
    for (let i = 0; i < 200; i += 1) {
      const { headline } = summarizeCycle(logs, date);
      if (headline.kind === 'upcoming' || headline.kind === 'late') {
        expect(headline.days).toBeGreaterThan(0);
      }
      date = addDays(date, 1);
    }
  });

  it('lets a recorded period outrank a late estimate', () => {
    const logs = [
      log('a', '2026-06-27', '2026-07-01'),
      log('b', '2026-07-25', '2026-07-29'),
      log('c', '2026-08-25', '2026-08-29'),
    ];
    const summary = summarizeCycle(logs, '2026-08-27');
    expect(summary.headline).toEqual({ kind: 'period-day', day: 3 });
    expect(summary.phase).toBe('menstrual');
  });

  it('treats an open period as ongoing past its expected length', () => {
    const logs = [log('a', '2026-07-25', '2026-07-29'), log('b', '2026-08-20')];
    expect(summarizeCycle(logs, '2026-08-28').headline).toEqual({
      kind: 'period-day',
      day: 9,
    });
  });

  it('reports the day the period started as day 1', () => {
    const logs = [log('a', '2026-08-16')];
    expect(summarizeCycle(logs, '2026-08-16').headline).toEqual({
      kind: 'period-day',
      day: 1,
    });
  });
});

describe('hubCycleLabel', () => {
  const labelFor = (logs: PeriodLog[], today: string) =>
    hubCycleLabel(summarizeCycle(logs, today));

  it('asks to be set up when empty', () => {
    expect(labelFor([], '2026-08-16')).toBe('Not set up yet');
  });

  it('counts down in plural and singular', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    expect(labelFor(logs, '2026-08-16')).toBe('Period in 6 days');
    expect(labelFor(logs, '2026-08-21')).toBe('Period in 1 day');
  });

  it('names the day itself', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    expect(labelFor(logs, '2026-08-22')).toBe('Period today');
  });

  it('names lateness', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    expect(labelFor(logs, '2026-08-23')).toBe('1 day late');
    expect(labelFor(logs, '2026-08-26')).toBe('4 days late');
  });

  it('names the day of an ongoing period', () => {
    expect(labelFor([log('a', '2026-08-15')], '2026-08-16')).toBe('Day 2 of period');
  });
});

describe('validateStart', () => {
  const logs = [log('a', '2026-07-01'), log('b', '2026-07-29')];

  it('accepts a plausible new start', () => {
    expect(validateStart('2026-08-26', logs, '2026-08-26', null)).toBeNull();
  });

  it('rejects a date in the future', () => {
    expect(validateStart('2026-08-27', logs, '2026-08-26', null)).toBe('future-date');
  });

  it('accepts today itself', () => {
    expect(validateStart('2026-08-26', logs, '2026-08-26', null)).toBeNull();
  });

  it('rejects a duplicate start', () => {
    expect(validateStart('2026-07-29', logs, '2026-08-26', null)).toBe('duplicate-start');
  });

  it('rejects a start before the latest logged one', () => {
    expect(validateStart('2026-07-15', logs, '2026-08-26', null)).toBe('start-before-previous');
  });

  it('ignores the row being edited when checking for duplicates', () => {
    expect(validateStart('2026-07-29', logs, '2026-08-26', 'b')).toBeNull();
  });

  it('does not impose ordering on an edit, so an earlier date is allowed', () => {
    expect(validateStart('2026-06-20', logs, '2026-08-26', 'b')).toBeNull();
    expect(validateStart('2026-07-20', logs, '2026-08-26', 'b')).toBeNull();
  });

  it('accepts an edit to a row that is not the newest', () => {
    const three = [
      log('a', '2026-07-01'),
      log('b', '2026-07-15'),
      log('c', '2026-07-29'),
    ];
    expect(validateStart('2026-07-16', three, '2026-08-26', 'b')).toBeNull();
    expect(validateStart('2026-06-15', three, '2026-08-26', 'a')).toBeNull();
  });

  it('still refuses a future date or a duplicate when editing', () => {
    expect(validateStart('2026-08-27', logs, '2026-08-26', 'b')).toBe('future-date');
    expect(validateStart('2026-07-01', logs, '2026-08-26', 'b')).toBe('duplicate-start');
  });
});

describe('validateEnd', () => {
  it('accepts an end on or after the start', () => {
    expect(validateEnd('2026-08-20', '2026-08-16', '2026-08-26')).toBeNull();
    expect(validateEnd('2026-08-16', '2026-08-16', '2026-08-26')).toBeNull();
  });

  it('rejects an end before its start', () => {
    expect(validateEnd('2026-08-15', '2026-08-16', '2026-08-26')).toBe('end-before-start');
  });

  it('rejects an end in the future', () => {
    expect(validateEnd('2026-08-27', '2026-08-16', '2026-08-26')).toBe('future-date');
  });
});

describe('VALIDATION_MESSAGES', () => {
  it('has plain-English text for every error', () => {
    const errors = ['future-date', 'end-before-start', 'start-before-previous', 'duplicate-start'] as const;
    for (const error of errors) {
      expect(VALIDATION_MESSAGES[error].length).toBeGreaterThan(0);
    }
  });
});
