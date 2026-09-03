import { describe, expect, it } from 'vitest';
import { gridHours, rowSpanOf, rulesByWeekday } from './timetableGrid';
import type { TimetableRule } from './timetableRule';

function rule(over: Partial<TimetableRule> = {}): TimetableRule {
  return {
    id: 'r1',
    owner: 'Jeff',
    weekday: 0,
    title: 'Maths',
    startTime: '09:00',
    endTime: '11:00',
    swatch: 1,
    ...over,
  };
}

describe('gridHours', () => {
  it('uses the default band when there are no rules', () => {
    expect(gridHours([])).toEqual({ from: 8, to: 18 });
  });

  it('never narrows past the default band', () => {
    expect(gridHours([rule()])).toEqual({ from: 8, to: 18 });
  });

  it('widens upward for an early rule', () => {
    expect(gridHours([rule({ startTime: '06:00', endTime: '07:00' })]).from).toBe(6);
  });

  it('widens downward for a late rule', () => {
    expect(gridHours([rule({ startTime: '19:00', endTime: '21:00' })]).to).toBe(21);
  });

  it('rounds a part-hour end up to the next whole hour', () => {
    expect(gridHours([rule({ startTime: '19:00', endTime: '20:30' })]).to).toBe(21);
  });

  it('spans the earliest start and the latest end across all rules', () => {
    const rules = [
      rule({ id: 'a', startTime: '07:00', endTime: '08:00' }),
      rule({ id: 'b', weekday: 2, startTime: '20:00', endTime: '22:00' }),
    ];
    expect(gridHours(rules)).toEqual({ from: 7, to: 22 });
  });
});

describe('rulesByWeekday', () => {
  it('always returns seven lists', () => {
    expect(rulesByWeekday([])).toHaveLength(7);
  });

  it('keeps empty days as empty lists rather than dropping them', () => {
    const days = rulesByWeekday([rule({ weekday: 2 })]);
    expect(days[0]).toEqual([]);
    expect(days[2]).toHaveLength(1);
  });

  it('puts each rule in its own weekday', () => {
    const days = rulesByWeekday([
      rule({ id: 'mon', weekday: 0 }),
      rule({ id: 'sun', weekday: 6 }),
    ]);
    expect(days[0][0].id).toBe('mon');
    expect(days[6][0].id).toBe('sun');
  });

  it('orders each day by start time', () => {
    const days = rulesByWeekday([
      rule({ id: 'late', startTime: '13:00', endTime: '14:00' }),
      rule({ id: 'early', startTime: '09:00', endTime: '10:00' }),
    ]);
    expect(days[0].map((r) => r.id)).toEqual(['early', 'late']);
  });
});

describe('rowSpanOf', () => {
  it('places a rule relative to the top of the band', () => {
    expect(rowSpanOf(rule({ startTime: '09:00', endTime: '11:00' }), 8)).toEqual({
      startRow: 2,
      endRow: 4,
    });
  });

  it('gives the first hour of the band row 1', () => {
    expect(rowSpanOf(rule({ startTime: '08:00', endTime: '09:00' }), 8).startRow).toBe(1);
  });

  it('gives a one-hour rule a span of exactly one row', () => {
    const span = rowSpanOf(rule({ startTime: '10:00', endTime: '11:00' }), 8);
    expect(span.endRow - span.startRow).toBe(1);
  });

  it('rounds a part-hour end up so the block covers the hour it runs into', () => {
    const span = rowSpanOf(rule({ startTime: '10:00', endTime: '10:30' }), 8);
    expect(span.endRow - span.startRow).toBe(1);
  });
});
