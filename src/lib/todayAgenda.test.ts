import { describe, expect, it } from 'vitest';
import { buildAgenda } from './todayAgenda';
import type { CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

function event(
  id: string,
  title: string,
  date: string,
  timing: CalendarEvent['timing'],
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

function todo(
  id: string,
  title: string,
  dueDate: string | null,
  dueTime: string | null,
  done = false,
): Todo {
  const base = {
    id,
    owner: 'Jeff' as const,
    title,
    dueDate,
    dueTime,
    sortOrder: 0,
    priority: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  return done
    ? { ...base, done: true, completedAt: '2026-09-11T09:00:00.000Z' }
    : { ...base, done: false, completedAt: null };
}

const TODAY = '2026-09-11';

describe('buildAgenda', () => {
  it('puts a timed event before an all-day event', () => {
    const events = [
      event('a', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
      event('b', 'Class', TODAY, { kind: 'moment', startTime: '09:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Class',
      'Holiday',
    ]);
  });

  it('orders timed events by start time', () => {
    const events = [
      event('a', 'Gym', TODAY, { kind: 'moment', startTime: '14:00' }),
      event('b', 'Class', TODAY, { kind: 'span', startTime: '09:00', endTime: '11:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual(['Class', 'Gym']);
  });

  it('puts every event before every to-do', () => {
    const events = [
      event('a', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
    ];
    const todos = [todo('t1', 'Buy milk', TODAY, '07:00')];

    const agenda = buildAgenda(events, todos, TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Holiday',
      'Buy milk',
    ]);
  });

  it('puts an overdue to-do above one due today and marks it late', () => {
    const todos = [
      todo('t1', 'Buy milk', TODAY, '07:00'),
      todo('t2', 'Email Dr Lim', '2026-09-08', null),
    ];

    const agenda = buildAgenda([], todos, TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Email Dr Lim',
      'Buy milk',
    ]);
    expect(agenda.items[0]).toMatchObject({ kind: 'todo', late: true });
    expect(agenda.items[1]).toMatchObject({ kind: 'todo', late: false });
  });

  it('drops a finished to-do due today', () => {
    const todos = [todo('t1', 'Buy milk', TODAY, null, true)];

    const agenda = buildAgenda([], todos, TODAY, 4);

    expect(agenda.items).toEqual([]);
    expect(agenda.hiddenCount).toBe(0);
  });

  it('drops an event on another day', () => {
    const events = [
      event('a', 'Trip', '2026-09-20', { kind: 'allDay', endDate: null }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).items).toEqual([]);
  });

  it('keeps a multi-day event that spans today', () => {
    const events = [
      event('a', 'Trip', '2026-09-09', { kind: 'allDay', endDate: '2026-09-13' }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).items).toHaveLength(1);
  });

  it('shows four rows and counts the rest as hidden', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
      event('b', 'Two', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('c', 'Three', TODAY, { kind: 'moment', startTime: '10:00' }),
      event('d', 'Four', TODAY, { kind: 'moment', startTime: '11:00' }),
      event('e', 'Five', TODAY, { kind: 'moment', startTime: '12:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items).toHaveLength(4);
    expect(agenda.hiddenCount).toBe(1);
  });

  it('sends more to the to-do page when every hidden row is a to-do', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
    ];
    const todos = [
      todo('t1', 'A', TODAY, '09:00'),
      todo('t2', 'B', TODAY, '10:00'),
      todo('t3', 'C', TODAY, '11:00'),
      todo('t4', 'D', TODAY, '12:00'),
    ];

    expect(buildAgenda(events, todos, TODAY, 4).moreHref).toBe(
      '/timetable/todo',
    );
  });

  it('sends more to the calendar when a hidden row is an event', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
      event('b', 'Two', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('c', 'Three', TODAY, { kind: 'moment', startTime: '10:00' }),
      event('d', 'Four', TODAY, { kind: 'moment', startTime: '11:00' }),
      event('e', 'Five', TODAY, { kind: 'moment', startTime: '12:00' }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).moreHref).toBe('/calendar');
  });

  it('reports the calendar as the more link when nothing is hidden', () => {
    const agenda = buildAgenda([], [], TODAY, 4);

    expect(agenda.hiddenCount).toBe(0);
    expect(agenda.moreHref).toBe('/calendar');
  });

  it('labels chips by kind', () => {
    const events = [
      event('a', 'Class', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('b', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
    ];
    const todos = [
      todo('t1', 'Buy milk', TODAY, null),
      todo('t2', 'Email', '2026-09-08', null),
    ];

    const agenda = buildAgenda(events, todos, TODAY, 4);

    expect(agenda.items.map((item) => item.chip)).toEqual([
      '09:00',
      'all day',
      'Late',
      'to-do',
    ]);
  });
});
