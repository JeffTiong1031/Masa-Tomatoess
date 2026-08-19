import { describe, it, expect } from 'vitest';
import {
  occursOn,
  sortDay,
  timelineHours,
  type CalendarEvent,
  type EventTiming,
} from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  timing: EventTiming,
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing,
    notes: null,
    countdown: false,
    categoryId: null,
  };
}

const allDay = (endDate: string | null = null): EventTiming => ({
  kind: 'allDay',
  endDate,
});
const moment = (startTime: string): EventTiming => ({ kind: 'moment', startTime });
const span = (startTime: string, endTime: string): EventTiming => ({
  kind: 'span',
  startTime,
  endTime,
});

describe('sortDay', () => {
  it('puts all-day events before timed ones', () => {
    const timed = event('1', 'Dentist', '2026-08-25', moment('10:00'));
    const whole = event('2', 'Penang', '2026-08-25', allDay());
    expect(sortDay([timed, whole]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('orders timed events by start time', () => {
    const evening = event('1', 'Dinner', '2026-08-25', span('19:30', '21:00'));
    const morning = event('2', 'Dentist', '2026-08-25', moment('10:00'));
    expect(sortDay([evening, morning]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('breaks a tie on title so the order is stable', () => {
    const b = event('1', 'Beta', '2026-08-25', moment('10:00'));
    const a = event('2', 'Alpha', '2026-08-25', moment('10:00'));
    expect(sortDay([b, a]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('does not mutate its argument', () => {
    const input = [
      event('1', 'Dentist', '2026-08-25', moment('10:00')),
      event('2', 'Penang', '2026-08-25', allDay()),
    ];
    sortDay(input);
    expect(input.map((e) => e.id)).toEqual(['1', '2']);
  });
});

describe('occursOn', () => {
  it('matches its own date', () => {
    const e = event('1', 'Dentist', '2026-08-25', moment('10:00'));
    expect(occursOn(e, '2026-08-25')).toBe(true);
    expect(occursOn(e, '2026-08-26')).toBe(false);
  });

  it('covers every day of a span including both ends', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay('2026-08-24'));
    expect(occursOn(e, '2026-08-22')).toBe(true);
    expect(occursOn(e, '2026-08-23')).toBe(true);
    expect(occursOn(e, '2026-08-24')).toBe(true);
  });

  it('excludes the days either side of a span', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay('2026-08-24'));
    expect(occursOn(e, '2026-08-21')).toBe(false);
    expect(occursOn(e, '2026-08-25')).toBe(false);
  });

  it('treats a null end date as a single day', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay(null));
    expect(occursOn(e, '2026-08-23')).toBe(false);
  });
});

describe('timelineHours', () => {
  it('returns null when nothing is timed', () => {
    expect(timelineHours([event('1', 'Penang', '2026-08-22', allDay())])).toBeNull();
  });

  it('returns null for an empty day', () => {
    expect(timelineHours([])).toBeNull();
  });

  it('spans the earliest start to the hour after the latest end', () => {
    const events = [
      event('1', 'Dentist', '2026-08-25', span('10:00', '11:00')),
      event('2', 'Dinner', '2026-08-25', span('19:30', '21:00')),
    ];
    expect(timelineHours(events)).toEqual({ from: 10, to: 22 });
  });

  it('widens a lone event to the three-hour minimum', () => {
    const events = [event('1', 'Dentist', '2026-08-25', span('10:00', '11:00'))];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('counts a moment as one hour long', () => {
    const events = [event('1', 'Dentist', '2026-08-25', moment('10:00'))];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('ignores all-day events when picking the range', () => {
    const events = [
      event('1', 'Penang', '2026-08-25', allDay()),
      event('2', 'Dentist', '2026-08-25', span('10:00', '11:00')),
    ];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('never runs past midnight', () => {
    const events = [event('1', 'Late', '2026-08-25', span('22:00', '23:30'))];
    expect(timelineHours(events)).toEqual({ from: 21, to: 24 });
  });
});
