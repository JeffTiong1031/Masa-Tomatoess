import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  countsByDate,
  monthDots,
  weekDates,
} from './calendarViews';
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { UserName } from './identity';

function event(
  id: string,
  date: string,
  timing: EventTiming,
  owner: UserName = 'Jeff',
  categoryId: string | null = null,
): CalendarEvent {
  return {
    id,
    owner,
    title: `Event ${id}`,
    date,
    timing,
    notes: null,
    countdown: false,
    categoryId,
  };
}

const allDay = (endDate: string | null = null): EventTiming => ({
  kind: 'allDay',
  endDate,
});
const moment = (startTime: string): EventTiming => ({ kind: 'moment', startTime });

describe('weekDates', () => {
  it('returns seven dates starting on Monday', () => {
    expect(weekDates('2026-08-25')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('returns the same week whichever day of it is given', () => {
    expect(weekDates('2026-08-30')).toEqual(weekDates('2026-08-24'));
  });

  it('crosses a month boundary', () => {
    expect(weekDates('2026-09-01')[0]).toBe('2026-08-31');
  });

  it('crosses a year boundary', () => {
    expect(weekDates('2027-01-01')[0]).toBe('2026-12-28');
  });
});

describe('countsByDate', () => {
  it('counts one event on its own date', () => {
    const events = [event('1', '2026-08-25', moment('10:00'))];
    expect(countsByDate(events, ['2026-08-25'])).toEqual({ '2026-08-25': 1 });
  });

  it('counts a span once on each day it covers', () => {
    const events = [event('1', '2026-08-22', allDay('2026-08-24'))];
    const dates = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25'];
    expect(countsByDate(events, dates)).toEqual({
      '2026-08-22': 1,
      '2026-08-23': 1,
      '2026-08-24': 1,
      '2026-08-25': 0,
    });
  });

  it('gives every requested date a key, including empty ones', () => {
    expect(countsByDate([], ['2026-08-25'])).toEqual({ '2026-08-25': 0 });
  });
});

describe('monthDots', () => {
  it('passes small counts through', () => {
    expect(monthDots(0)).toBe(0);
    expect(monthDots(2)).toBe(2);
  });

  it('clamps at three', () => {
    expect(monthDots(3)).toBe(3);
    expect(monthDots(9)).toBe(3);
  });
});

describe('applyFilters', () => {
  const jeff = event('1', '2026-08-25', moment('10:00'), 'Jeff', 'study');
  const rachel = event('2', '2026-08-25', moment('11:00'), 'Rachel', 'health');
  const untagged = event('3', '2026-08-25', moment('12:00'), 'Jeff', null);
  const all = [jeff, rachel, untagged];

  it('keeps everything when the owner filter is both and no category is chosen', () => {
    expect(applyFilters(all, { owner: 'both', categoryIds: [] })).toHaveLength(3);
  });

  it('keeps only one person', () => {
    const result = applyFilters(all, { owner: 'Rachel', categoryIds: [] });
    expect(result.map((e) => e.id)).toEqual(['2']);
  });

  it('keeps only the chosen categories', () => {
    const result = applyFilters(all, { owner: 'both', categoryIds: ['study'] });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('excludes untagged events when a category filter is active', () => {
    const result = applyFilters(all, { owner: 'both', categoryIds: ['health'] });
    expect(result.map((e) => e.id)).toEqual(['2']);
  });

  it('combines both filters', () => {
    const result = applyFilters(all, { owner: 'Jeff', categoryIds: ['health'] });
    expect(result).toEqual([]);
  });

  it('removes a filtered event from the counts as well as the list', () => {
    const kept = applyFilters(all, { owner: 'Rachel', categoryIds: [] });
    expect(countsByDate(kept, ['2026-08-25'])).toEqual({ '2026-08-25': 1 });
  });
});
