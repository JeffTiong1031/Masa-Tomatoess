import { describe, expect, it } from 'vitest';
import {
  buildCalendarMonth,
  historyRows,
  predictedCycles,
} from './cycleCalendar';
import type { PeriodLog } from './cycle';

function log(id: string, startDate: string, endDate: string | null = null): PeriodLog {
  return { id, startDate, endDate };
}

const LOGS = [
  log('a', '2026-06-27', '2026-07-01'),
  log('b', '2026-07-25', '2026-07-29'),
];

const NO_SYMPTOMS = new Set<string>();

describe('predictedCycles', () => {
  it('is empty with no history', () => {
    expect(predictedCycles([], '2026-12-31')).toEqual([]);
  });

  it('projects forward from the last recorded start', () => {
    const cycles = predictedCycles(LOGS, '2026-09-30');
    expect(cycles[0]).toEqual({ startDate: '2026-08-22', endDate: '2026-08-26' });
    expect(cycles[1]).toEqual({ startDate: '2026-09-19', endDate: '2026-09-23' });
  });

  it('stops once it passes the requested date', () => {
    expect(predictedCycles(LOGS, '2026-08-31')).toHaveLength(1);
  });

  it('never projects more than twelve cycles', () => {
    expect(predictedCycles(LOGS, '2030-01-01')).toHaveLength(12);
  });
});

describe('buildCalendarMonth', () => {
  const days = buildCalendarMonth({
    month: '2026-08',
    logs: LOGS,
    today: '2026-08-16',
    symptomDates: NO_SYMPTOMS,
  });
  const dayAt = (date: string) => days.find((d) => d.date === date)!;

  it('returns a full six-week grid', () => {
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe('2026-07-27');
  });

  it('marks days outside the month', () => {
    expect(dayAt('2026-07-27').inMonth).toBe(false);
    expect(dayAt('2026-08-01').inMonth).toBe(true);
  });

  it('marks recorded period days solid and predicted days separately', () => {
    expect(dayAt('2026-07-27').recorded).toBe(true);
    expect(dayAt('2026-07-27').predicted).toBe(false);
    expect(dayAt('2026-08-22').predicted).toBe(true);
    expect(dayAt('2026-08-22').recorded).toBe(false);
  });

  it('covers the whole predicted period, not just its first day', () => {
    for (const date of ['2026-08-22', '2026-08-23', '2026-08-26']) {
      expect(dayAt(date).predicted).toBe(true);
    }
    expect(dayAt('2026-08-27').predicted).toBe(false);
  });

  it('paints the phases between periods', () => {
    expect(dayAt('2026-08-02').phase).toBe('follicular');
    expect(dayAt('2026-08-08').phase).toBe('fertile');
    expect(dayAt('2026-08-16').phase).toBe('luteal');
  });

  it('flags today exactly once', () => {
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(dayAt('2026-08-16').isToday).toBe(true);
  });

  it('knows nothing before the first logged period', () => {
    const early = buildCalendarMonth({
      month: '2026-05',
      logs: LOGS,
      today: '2026-08-16',
      symptomDates: NO_SYMPTOMS,
    });
    expect(early.every((d) => d.phase === null)).toBe(true);
  });

  it('draws a completed cycle at its own length, not the current average', () => {
    const irregular = [
      log('a', '2026-05-01', '2026-05-05'),
      log('b', '2026-06-04', '2026-06-08'),
      log('c', '2026-07-02', '2026-07-06'),
    ];
    const may = buildCalendarMonth({
      month: '2026-05',
      logs: irregular,
      today: '2026-07-20',
      symptomDates: NO_SYMPTOMS,
    });
    const at = (date: string) => may.find((d) => d.date === date)!.phase;
    expect(at('2026-05-20')).toBe('fertile');
    expect(at('2026-05-14')).toBe('follicular');
  });

  it('reports which days carry symptoms', () => {
    const withSymptoms = buildCalendarMonth({
      month: '2026-08',
      logs: LOGS,
      today: '2026-08-16',
      symptomDates: new Set(['2026-08-14']),
    });
    expect(withSymptoms.find((d) => d.date === '2026-08-14')!.hasSymptoms).toBe(true);
    expect(withSymptoms.find((d) => d.date === '2026-08-15')!.hasSymptoms).toBe(false);
  });

  it('treats an open period as recorded up to today and no further', () => {
    const open = buildCalendarMonth({
      month: '2026-08',
      logs: [log('a', '2026-07-25', '2026-07-29'), log('b', '2026-08-14')],
      today: '2026-08-16',
      symptomDates: NO_SYMPTOMS,
    });
    const at = (date: string) => open.find((d) => d.date === date)!;
    expect(at('2026-08-14').recorded).toBe(true);
    expect(at('2026-08-16').recorded).toBe(true);
    expect(at('2026-08-17').recorded).toBe(false);
  });
});

describe('historyRows', () => {
  it('is newest first', () => {
    expect(historyRows(LOGS).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('counts the days of a finished period', () => {
    expect(historyRows(LOGS)[0].days).toBe(5);
  });

  it('leaves an open period without a day count', () => {
    expect(historyRows([log('a', '2026-08-14')])[0].days).toBeNull();
  });

  it('reports the gap to the period before it', () => {
    expect(historyRows(LOGS)[0].cycleLength).toBe(28);
  });

  it('has no cycle length for the oldest row', () => {
    expect(historyRows(LOGS)[1].cycleLength).toBeNull();
  });
});
