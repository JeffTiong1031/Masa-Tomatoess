import { describe, it, expect } from 'vitest';
import { groupOf, compareTodos, groupTodos, weekEnd } from './todoList';
import type { OpenTodo, Todo } from './todo';

function open(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'a',
    owner: 'Jeff',
    title: 'task',
    dueDate: null,
    dueTime: null,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-08-26T08:00:00.000Z',
    ...overrides,
  };
}

const TODAY = '2026-08-26';

describe('weekEnd', () => {
  it('returns the Sunday of the given week', () => {
    expect(weekEnd('2026-08-26')).toBe('2026-08-30');
    expect(weekEnd('2026-08-30')).toBe('2026-08-30');
    expect(weekEnd('2026-08-31')).toBe('2026-09-06');
  });
});

describe('groupOf', () => {
  it('puts yesterday in Overdue and today in Today', () => {
    expect(groupOf(open({ dueDate: '2026-08-25' }), TODAY, '09:00:00')).toBe('Overdue');
    expect(groupOf(open({ dueDate: TODAY }), TODAY, '09:00:00')).toBe('Today');
  });

  it('turns a timed task overdue one second after its time', () => {
    const task = open({ dueDate: TODAY, dueTime: '14:00' });
    expect(groupOf(task, TODAY, '13:59:59')).toBe('Today');
    expect(groupOf(task, TODAY, '14:00:00')).toBe('Today');
    expect(groupOf(task, TODAY, '14:00:01')).toBe('Overdue');
  });

  it('keeps an untimed task in Today all day', () => {
    expect(groupOf(open({ dueDate: TODAY }), TODAY, '23:59:59')).toBe('Today');
  });

  it('separates tomorrow, this week and later', () => {
    expect(groupOf(open({ dueDate: '2026-08-27' }), TODAY, '09:00:00')).toBe('Tomorrow');
    expect(groupOf(open({ dueDate: '2026-08-29' }), TODAY, '09:00:00')).toBe('This week');
    expect(groupOf(open({ dueDate: '2026-09-14' }), TODAY, '09:00:00')).toBe('Later');
  });

  it('gives Tomorrow priority over This week on a Saturday', () => {
    const saturday = '2026-08-29';
    expect(groupOf(open({ dueDate: '2026-08-30' }), saturday, '09:00:00')).toBe('Tomorrow');
  });

  it('gives Tomorrow priority over This week on a Sunday', () => {
    const sunday = '2026-08-30';
    expect(groupOf(open({ dueDate: '2026-08-31' }), sunday, '09:00:00')).toBe('Tomorrow');
    expect(groupOf(open({ dueDate: '2026-09-01' }), sunday, '09:00:00')).toBe('Later');
  });

  it('puts an undated task in No date, never Later', () => {
    expect(groupOf(open(), TODAY, '09:00:00')).toBe('No date');
  });
});

describe('compareTodos', () => {
  it('sorts an earlier date first', () => {
    const early = open({ id: 'e', dueDate: '2026-08-26' });
    const late = open({ id: 'l', dueDate: '2026-08-28' });
    expect(compareTodos(early, late)).toBeLessThan(0);
  });

  it('sorts undated last', () => {
    expect(compareTodos(open({ dueDate: '2026-12-31' }), open())).toBeLessThan(0);
  });

  it('sorts a flagged task above an unflagged one on the same date', () => {
    const flagged = open({ id: 'f', dueDate: TODAY, priority: true });
    const plain = open({ id: 'p', dueDate: TODAY });
    expect(compareTodos(flagged, plain)).toBeLessThan(0);
  });

  it('does not let a flag outrank an earlier date', () => {
    const flaggedLater = open({ id: 'f', dueDate: '2026-09-02', priority: true });
    const plainToday = open({ id: 'p', dueDate: TODAY });
    expect(compareTodos(plainToday, flaggedLater)).toBeLessThan(0);
  });

  it('sorts an earlier time first, and both above an untimed task', () => {
    const nine = open({ id: '9', dueDate: TODAY, dueTime: '09:00' });
    const five = open({ id: '5', dueDate: TODAY, dueTime: '17:00' });
    const none = open({ id: 'n', dueDate: TODAY });
    expect(compareTodos(nine, five)).toBeLessThan(0);
    expect(compareTodos(five, none)).toBeLessThan(0);
  });

  it('falls back to creation order', () => {
    const first = open({ id: '1', createdAt: '2026-08-20T08:00:00.000Z' });
    const second = open({ id: '2', createdAt: '2026-08-21T08:00:00.000Z' });
    expect(compareTodos(first, second)).toBeLessThan(0);
  });
});

describe('groupTodos', () => {
  it('returns groups in order and omits empty ones', () => {
    const todos: Todo[] = [
      open({ id: 'later', dueDate: '2026-09-20' }),
      open({ id: 'overdue', dueDate: '2026-08-01' }),
      open({ id: 'none' }),
    ];
    expect(groupTodos(todos, TODAY, '09:00:00').map((group) => group.name)).toEqual([
      'Overdue',
      'Later',
      'No date',
    ]);
  });

  it('sorts inside a group', () => {
    const todos: Todo[] = [
      open({ id: 'plain', dueDate: TODAY }),
      open({ id: 'flagged', dueDate: TODAY, priority: true }),
    ];
    const [today] = groupTodos(todos, TODAY, '09:00:00');
    expect(today.todos.map((todo) => todo.id)).toEqual(['flagged', 'plain']);
  });

  it('leaves completed tasks out of every group', () => {
    const todos: Todo[] = [
      { ...open({ id: 'done', dueDate: TODAY }), done: true, completedAt: '2026-08-26T10:00:00.000Z' },
    ];
    expect(groupTodos(todos, TODAY, '09:00:00')).toEqual([]);
  });
});
