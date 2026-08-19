import { describe, it, expect } from 'vitest';
import { groupByDate, searchEvents } from './calendarSearch';
import type { CalendarEvent } from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  notes: string | null = null,
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing: { kind: 'moment', startTime: '10:00' },
    notes,
    countdown: false,
    categoryId: null,
  };
}

const events = [
  event('1', 'Dentist', '2026-08-25', 'Bring the referral letter'),
  event('2', 'Dinner with Rachel', '2026-08-26'),
  event('3', 'Lecture', '2026-08-25', 'Dentistry module'),
];

describe('searchEvents', () => {
  it('returns nothing for a blank query', () => {
    expect(searchEvents(events, '')).toEqual([]);
  });

  it('returns nothing for a whitespace-only query', () => {
    expect(searchEvents(events, '   ')).toEqual([]);
  });

  it('matches titles case-insensitively', () => {
    expect(searchEvents(events, 'DINNER').map((e) => e.id)).toEqual(['2']);
  });

  it('matches notes as well as titles', () => {
    expect(searchEvents(events, 'referral').map((e) => e.id)).toEqual(['1']);
  });

  it('returns an event matching in both places exactly once', () => {
    const both = [event('4', 'Dentist', '2026-08-27', 'Dentist again')];
    expect(searchEvents(both, 'dentist')).toHaveLength(1);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(searchEvents(events, '  lecture  ').map((e) => e.id)).toEqual(['3']);
  });

  it('tolerates a null notes field', () => {
    expect(searchEvents(events, 'rachel').map((e) => e.id)).toEqual(['2']);
  });

  it('matches a substring across several events', () => {
    expect(searchEvents(events, 'dent').map((e) => e.id).sort()).toEqual([
      '1',
      '3',
    ]);
  });
});

describe('groupByDate', () => {
  it('groups by date in ascending order', () => {
    expect(groupByDate(events).map((group) => group.date)).toEqual([
      '2026-08-25',
      '2026-08-26',
    ]);
  });

  it('sorts within a group', () => {
    const group = groupByDate(events)[0];
    expect(group.events.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('returns nothing for no events', () => {
    expect(groupByDate([])).toEqual([]);
  });
});
