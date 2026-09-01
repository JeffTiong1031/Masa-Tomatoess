import { describe, it, expect } from 'vitest';
import {
  assignHandles,
  buildTodoSnapshot,
  emptyHandleMap,
  handleOf,
  idOf,
  MAX_TODO_ROWS,
} from './assistantContext';
import type { DoneTodo, OpenTodo, Todo } from './todo';

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
      priority: false,
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
