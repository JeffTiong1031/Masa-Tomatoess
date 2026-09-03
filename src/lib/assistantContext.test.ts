import { describe, it, expect } from 'vitest';
import {
  assignHandles,
  buildCalendarSnapshot,
  buildTodoSnapshot,
  emptyHandleMap,
  handleOf,
  idOf,
  MAX_EVENT_ROWS,
  MAX_NOTE_CHARS,
  MAX_TODO_ROWS,
  type CalendarSnapshot,
} from './assistantContext';
import type { DoneTodo, OpenTodo, Todo } from './todo';
import type { CalendarEvent } from './calendarEvent';
import type { Category } from './categories';

describe('assignHandles', () => {
  it('numbers rows from one, in order', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    expect(handleOf(map, 'aaa')).toBe('t1');
    expect(handleOf(map, 'bbb')).toBe('t2');
    expect(handleOf(map, 'ccc')).toBe('t3');
  });

  it('keeps a handle when the same row comes back', () => {
    const first = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const second = assignHandles(first, ['aaa', 'bbb']);
    expect(handleOf(second, 'aaa')).toBe('t1');
    expect(handleOf(second, 'bbb')).toBe('t2');
  });

  it('never lets a handle change meaning after a row is deleted', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    const turnTwo = assignHandles(turnOne, ['aaa', 'ccc']);
    const turnThree = assignHandles(turnTwo, ['aaa', 'ccc', 'ddd']);

    expect(idOf(turnThree, 't1')).toBe('aaa');
    expect(idOf(turnThree, 't2')).toBe('bbb');
    expect(idOf(turnThree, 't3')).toBe('ccc');
    expect(idOf(turnThree, 't4')).toBe('ddd');
  });

  it('keeps a deleted row resolvable so a plan aimed at it can be caught', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const turnTwo = assignHandles(turnOne, ['aaa']);
    expect(idOf(turnTwo, 't2')).toBe('bbb');
  });

  it('returns null for a handle it never issued', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(idOf(map, 't99')).toBeNull();
  });

  it('returns null for __proto__ even though it is an inherited object property', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(idOf(map, '__proto__')).toBeNull();
  });

  it('returns null for constructor even though it is an inherited function property', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(idOf(map, 'constructor')).toBeNull();
  });

  it('returns null when handleOf is asked for an id with an inherited property name', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(handleOf(map, '__proto__')).toBeNull();
  });

  it('returns null when handleOf is asked for constructor', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(handleOf(map, 'constructor')).toBeNull();
  });

  it('uses the prefix it was given', () => {
    const map = assignHandles(emptyHandleMap('e'), ['aaa']);
    expect(handleOf(map, 'aaa')).toBe('e1');
  });

  it('does not mutate the map it was given', () => {
    const first = emptyHandleMap('t');
    assignHandles(first, ['aaa']);
    expect(first.next).toBe(1);
    expect(handleOf(first, 'aaa')).toBeNull();
  });
});

function open(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'aaa',
    owner: 'Jeff',
    title: 'task',
    dueDate: null,
    dueTime: null,
    sortOrder: 100,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

function done(overrides: Partial<DoneTodo> = {}): DoneTodo {
  return { ...open(), done: true, completedAt: '2026-09-01T10:00:00.000Z', ...overrides };
}

const TODAY = '2026-09-01';
const NOW = '14:30:00';

describe('buildTodoSnapshot', () => {
  it('names today and its weekday', () => {
    const { snapshot } = buildTodoSnapshot([], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.today).toBe('2026-09-01');
    expect(snapshot.weekday).toBe('Tue');
    expect(snapshot.now).toBe('14:30:00');
  });

  it('sends every open task whatever its date', () => {
    const rows: Todo[] = [
      open({ id: 'aaa', title: 'near', dueDate: '2026-09-02' }),
      open({ id: 'bbb', title: 'far', dueDate: '2031-01-01' }),
      open({ id: 'ccc', title: 'undated' }),
    ];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['near', 'far', 'undated']);
  });

  it('turns nulls into empty strings', () => {
    const { snapshot } = buildTodoSnapshot([open()], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows[0]).toEqual({
      handle: 't1',
      title: 'task',
      dueDate: '',
      dueTime: '',
      done: false,
    });
  });

  it('keeps a task completed inside the seven day window', () => {
    const rows: Todo[] = [done({ id: 'bbb', title: 'recent', completedAt: '2026-08-27T09:00:00.000Z' })];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['recent']);
  });

  it('drops a task completed before the window', () => {
    const rows: Todo[] = [done({ id: 'bbb', title: 'old', completedAt: '2026-07-01T09:00:00.000Z' })];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows).toEqual([]);
  });

  it('caps the row count and keeps open tasks over completed ones', () => {
    const open_ = Array.from({ length: MAX_TODO_ROWS }, (_, i) =>
      open({ id: `o${i}`, title: `open ${i}` }),
    );
    const done_ = [done({ id: 'd0', title: 'finished' })];
    const { snapshot } = buildTodoSnapshot([...open_, ...done_], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows).toHaveLength(MAX_TODO_ROWS);
    expect(snapshot.rows.some((row) => row.title === 'finished')).toBe(false);
  });

  it('hands back a map that already holds the rows it sent', () => {
    const { snapshot, map } = buildTodoSnapshot([open({ id: 'aaa' })], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows[0].handle).toBe('t1');
    expect(idOf(map, 't1')).toBe('aaa');
  });
});

const CAL_TODAY = '2026-09-02';
const CAL_NOW = '14:30:00';

const CATS: Category[] = [
  { id: 'c-work', name: 'Work', swatch: 1, position: 0 },
  { id: 'c-sport', name: 'Sport', swatch: 2, position: 1 },
];

function ev(over: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    owner: 'Jeff',
    title: 'Standup',
    date: '2026-09-03',
    timing: { kind: 'moment', startTime: '09:00' },
    notes: null,
    countdown: false,
    categoryId: null,
    ...over,
  };
}

function build(rows: CalendarEvent[], owner: 'Jeff' | 'Rachel' = 'Jeff'): CalendarSnapshot {
  return buildCalendarSnapshot(rows, CATS, owner, emptyHandleMap('e'), CAL_TODAY, CAL_NOW).snapshot;
}

describe('buildCalendarSnapshot', () => {
  it('states today, the weekday and the clock it was given', () => {
    const snapshot = build([]);
    expect(snapshot.today).toBe(CAL_TODAY);
    expect(snapshot.weekday).toBe('Wed');
    expect(snapshot.now).toBe(CAL_NOW);
  });

  it('sends the wide window when the rows fit', () => {
    const snapshot = build([ev({ id: 'a' })]);
    expect(snapshot.from).toBe('2026-08-03');
    expect(snapshot.to).toBe('2026-12-01');
  });

  it('sends your category names', () => {
    expect(build([]).categories).toEqual(['Work', 'Sport']);
  });

  it('sends only your own events', () => {
    const snapshot = build([ev({ id: 'a' }), ev({ id: 'b', owner: 'Rachel', title: 'Hers' })]);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['Standup']);
  });

  it('drops an event before the window', () => {
    expect(build([ev({ id: 'a', date: '2026-07-01' })]).rows).toEqual([]);
  });

  it('drops an event after the window', () => {
    expect(build([ev({ id: 'a', date: '2026-12-14' })]).rows).toEqual([]);
  });

  it('keeps a long all-day event that reaches into the window', () => {
    const spanning = ev({
      id: 'a',
      date: '2026-07-20',
      timing: { kind: 'allDay', endDate: '2026-08-10' },
    });
    expect(build([spanning]).rows.length).toBe(1);
  });

  it('flattens each timing into plain fields', () => {
    const rows = build([
      ev({ id: 'a', date: '2026-09-03', timing: { kind: 'moment', startTime: '09:00' } }),
      ev({
        id: 'b',
        date: '2026-09-04',
        timing: { kind: 'span', startTime: '10:00', endTime: '11:30' },
      }),
      ev({ id: 'c', date: '2026-09-05', timing: { kind: 'allDay', endDate: '2026-09-06' } }),
    ]).rows;

    expect(rows[0]).toMatchObject({ startTime: '09:00', endTime: '', endDate: '' });
    expect(rows[1]).toMatchObject({ startTime: '10:00', endTime: '11:30', endDate: '' });
    expect(rows[2]).toMatchObject({ startTime: '', endTime: '', endDate: '2026-09-06' });
  });

  it('names the category rather than sending an id', () => {
    const rows = build([ev({ id: 'a', categoryId: 'c-sport' })]).rows;
    expect(rows[0].category).toBe('Sport');
  });

  it('leaves the category empty when the event has none', () => {
    expect(build([ev({ id: 'a' })]).rows[0].category).toBe('');
  });

  it('trims notes and never sends null', () => {
    const long = 'x'.repeat(400);
    const rows = build([ev({ id: 'a', notes: long }), ev({ id: 'b', notes: null })]).rows;
    expect(rows[0].notes.length).toBe(MAX_NOTE_CHARS);
    expect(rows[1].notes).toBe('');
  });

  it('orders by date, then by start time, with all-day first', () => {
    const rows = build([
      ev({ id: 'a', date: '2026-09-04', title: 'Later day' }),
      ev({ id: 'b', date: '2026-09-03', title: 'Timed', timing: { kind: 'moment', startTime: '15:00' } }),
      ev({ id: 'c', date: '2026-09-03', title: 'All day', timing: { kind: 'allDay', endDate: null } }),
    ]).rows;
    expect(rows.map((row) => row.title)).toEqual(['All day', 'Timed', 'Later day']);
  });

  it('narrows the window when the wide one is over the cap, and says so', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 10 }, (_, index) =>
      ev({ id: `w${index}`, date: index < 20 ? '2026-08-05' : '2026-09-10' }),
    );
    const snapshot = build(rows);
    expect(snapshot.from).toBe('2026-08-19');
    expect(snapshot.to).toBe('2026-10-17');
    expect(snapshot.rows.length).toBe(MAX_EVENT_ROWS + 10 - 20);
  });

  it('never reports a range wider than the rows it actually sent', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 40 }, (_, index) =>
      ev({ id: `n${index}`, date: '2026-09-10' }),
    );
    const snapshot = build(rows);
    expect(snapshot.rows.length).toBe(MAX_EVENT_ROWS);
    expect(snapshot.to).toBe('2026-09-10');
  });

  it('gives every row a handle and never reuses one across turns', () => {
    const first = buildCalendarSnapshot(
      [ev({ id: 'a' }), ev({ id: 'b', date: '2026-09-04' })],
      CATS,
      'Jeff',
      emptyHandleMap('e'),
      CAL_TODAY,
      CAL_NOW,
    );
    expect(first.snapshot.rows.map((row) => row.handle)).toEqual(['e1', 'e2']);

    const second = buildCalendarSnapshot(
      [ev({ id: 'b', date: '2026-09-04' }), ev({ id: 'c', date: '2026-09-05' })],
      CATS,
      'Jeff',
      first.map,
      CAL_TODAY,
      CAL_NOW,
    );
    expect(second.snapshot.rows.map((row) => row.handle)).toEqual(['e2', 'e3']);
  });
});
