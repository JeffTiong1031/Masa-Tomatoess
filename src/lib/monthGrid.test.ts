import { describe, expect, it } from 'vitest';
import { buildMonthGrid, busyDates } from './monthGrid';
import { monthGridDates } from './dates';
import type { CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

function event(id: string, date: string): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title: 'Thing',
    date,
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: false,
    categoryId: null,
  };
}

function todo(id: string, dueDate: string | null, done = false): Todo {
  const base = {
    id,
    owner: 'Jeff' as const,
    title: 'Thing',
    dueDate,
    dueTime: null,
    sortOrder: 0,
    priority: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  return done
    ? { ...base, done: true, completedAt: '2026-09-11T09:00:00.000Z' }
    : { ...base, done: false, completedAt: null };
}

describe('buildMonthGrid', () => {
  it('returns 42 cells', () => {
    expect(buildMonthGrid('2026-09-11', new Set())).toHaveLength(42);
  });

  it('flags exactly one cell as today', () => {
    const cells = buildMonthGrid('2026-09-11', new Set());
    const todays = cells.filter((cell) => cell.isToday);

    expect(todays).toHaveLength(1);
    expect(todays[0].date).toBe('2026-09-11');
    expect(todays[0].day).toBe(11);
  });

  it('marks days outside the month', () => {
    const cells = buildMonthGrid('2026-09-11', new Set());

    expect(cells[0].inMonth).toBe(false);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it('flags a busy day and leaves the others alone', () => {
    const cells = buildMonthGrid('2026-09-11', new Set(['2026-09-14']));
    const busy = cells.filter((cell) => cell.hasItems);

    expect(busy).toHaveLength(1);
    expect(busy[0].date).toBe('2026-09-14');
  });
});

describe('busyDates', () => {
  const dates = monthGridDates('2026-09');

  it('collects event days and open to-do days', () => {
    const result = busyDates(
      [event('a', '2026-09-14')],
      [todo('t1', '2026-09-16')],
      dates,
    );

    expect([...result].sort()).toEqual(['2026-09-14', '2026-09-16']);
  });

  it('ignores finished to-dos and to-dos with no date', () => {
    const result = busyDates(
      [],
      [todo('t1', '2026-09-16', true), todo('t2', null)],
      dates,
    );

    expect(result.size).toBe(0);
  });

  it('marks every day a multi-day event covers', () => {
    const spanning: CalendarEvent = {
      ...event('a', '2026-09-14'),
      timing: { kind: 'allDay', endDate: '2026-09-16' },
    };

    const result = busyDates([spanning], [], dates);

    expect([...result].sort()).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });
});
