import { describe, it, expect } from 'vitest';
import {
  groupOf,
  compareTodos,
  groupTodos,
  weekEnd,
  completedTodos,
  nextOverdueAt,
  msUntil,
  nextWakeDelayMs,
  OVERDUE_WAKE_SLACK_MS,
  reorderInGroup,
  clampReorderInGroup,
  placeInPriorityFence,
  sortOrdersForOrder,
  SORT_ORDER_GAP,
} from './todoList';
import { addDays } from './dates';
import type { OpenTodo, Todo, DoneTodo } from './todo';

function open(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'a',
    owner: 'Jeff',
    title: 'task',
    dueDate: null,
    dueTime: null,
    sortOrder: 100,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-08-26T08:00:00.000Z',
    ...overrides,
  };
}

const TODAY = '2026-08-26';

function done(overrides: Partial<DoneTodo> = {}): DoneTodo {
  return { ...open(), done: true, completedAt: '2026-08-26T10:00:00.000Z', ...overrides };
}

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
  it('sorts by sortOrder ascending', () => {
    const first = open({ id: '1', sortOrder: 100 });
    const second = open({ id: '2', sortOrder: 200 });
    expect(compareTodos(first, second)).toBeLessThan(0);
  });

  it('falls back to creation order when sortOrder matches', () => {
    const first = open({ id: '1', sortOrder: 100, createdAt: '2026-08-20T08:00:00.000Z' });
    const second = open({ id: '2', sortOrder: 100, createdAt: '2026-08-21T08:00:00.000Z' });
    expect(compareTodos(first, second)).toBeLessThan(0);
  });

  it('lets manual order beat due time within a group', () => {
    const lateTimeFirst = open({ id: 'late', dueDate: TODAY, dueTime: '17:00', sortOrder: 100 });
    const earlyTimeSecond = open({ id: 'early', dueDate: TODAY, dueTime: '09:00', sortOrder: 200 });
    expect(compareTodos(lateTimeFirst, earlyTimeSecond)).toBeLessThan(0);
  });

  it('puts flagged tasks before unflagged ones even when sortOrder is later', () => {
    const flagged = open({ id: 'flagged', sortOrder: 300, priority: true });
    const plain = open({ id: 'plain', sortOrder: 100, priority: false });
    expect(compareTodos(flagged, plain)).toBeLessThan(0);
  });
});

describe('clampReorderInGroup', () => {
  const group = [
    open({ id: 'p1', sortOrder: 100, priority: true }),
    open({ id: 'p2', sortOrder: 200, priority: true }),
    open({ id: 'u1', sortOrder: 300, priority: false }),
    open({ id: 'u2', sortOrder: 400, priority: false }),
  ];

  it('lets flagged tasks reorder among flagged ones', () => {
    expect(clampReorderInGroup(group, 'p2', 'p1')).toEqual(['p2', 'p1', 'u1', 'u2']);
  });

  it('snaps a flagged task dragged onto unflagged to the last flagged slot', () => {
    expect(clampReorderInGroup(group, 'p1', 'u1')).toEqual(['p2', 'p1', 'u1', 'u2']);
  });

  it('lets unflagged tasks reorder among unflagged ones', () => {
    expect(clampReorderInGroup(group, 'u2', 'u1')).toEqual(['p1', 'p2', 'u2', 'u1']);
  });

  it('snaps an unflagged task dragged onto flagged to the first unflagged slot', () => {
    expect(clampReorderInGroup(group, 'u2', 'p1')).toEqual(['p1', 'p2', 'u2', 'u1']);
  });
});

describe('placeInPriorityFence', () => {
  const group = [
    open({ id: 'p1', sortOrder: 100, priority: true }),
    open({ id: 'p2', sortOrder: 200, priority: true }),
    open({ id: 'u1', sortOrder: 300, priority: false }),
    open({ id: 'u2', sortOrder: 400, priority: false }),
  ];

  it('puts a newly flagged task after the existing flagged block', () => {
    expect(placeInPriorityFence(group, 'u1', true)).toEqual(['p1', 'p2', 'u1', 'u2']);
  });

  it('puts an unflagged task at the top of the unflagged block', () => {
    expect(placeInPriorityFence(group, 'p1', false)).toEqual(['p2', 'p1', 'u1', 'u2']);
  });

  it('places a flagged task arriving from another section at the end of that section flagged block', () => {
    const destination = [
      open({ id: 'p1', sortOrder: 100, priority: true }),
      open({ id: 'u1', sortOrder: 200, priority: false }),
    ];
    expect(placeInPriorityFence(destination, 'incoming', true)).toEqual([
      'p1',
      'incoming',
      'u1',
    ]);
  });
});

describe('reorderInGroup', () => {
  it('moves an item to a new position', () => {
    const todos = [
      open({ id: 'a', sortOrder: 100 }),
      open({ id: 'b', sortOrder: 200 }),
      open({ id: 'c', sortOrder: 300 }),
    ];
    expect(reorderInGroup(todos, 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('returns the same order when ids are missing or equal', () => {
    const todos = [open({ id: 'a' }), open({ id: 'b' })];
    expect(reorderInGroup(todos, 'a', 'a')).toEqual(['a', 'b']);
    expect(reorderInGroup(todos, 'missing', 'a')).toEqual(['a', 'b']);
  });
});

describe('sortOrdersForOrder', () => {
  it('assigns spaced sort orders', () => {
    expect(sortOrdersForOrder(['a', 'b', 'c'])).toEqual([
      { id: 'a', sortOrder: SORT_ORDER_GAP },
      { id: 'b', sortOrder: SORT_ORDER_GAP * 2 },
      { id: 'c', sortOrder: SORT_ORDER_GAP * 3 },
    ]);
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

  it('sorts inside a group by sortOrder', () => {
    const todos: Todo[] = [
      open({ id: 'second', dueDate: TODAY, sortOrder: 200 }),
      open({ id: 'first', dueDate: TODAY, sortOrder: 100 }),
    ];
    const [today] = groupTodos(todos, TODAY, '09:00:00');
    expect(today.todos.map((todo) => todo.id)).toEqual(['first', 'second']);
  });

  it('leaves completed tasks out of every group', () => {
    const todos: Todo[] = [
      { ...open({ id: 'done', dueDate: TODAY }), done: true, completedAt: '2026-08-26T10:00:00.000Z' },
    ];
    expect(groupTodos(todos, TODAY, '09:00:00')).toEqual([]);
  });
});

describe('completedTodos', () => {
  it('shows the last seven days, newest first', () => {
    const todos: Todo[] = [
      done({ id: 'six', completedAt: '2026-08-20T10:00:00.000Z' }),
      done({ id: 'today', completedAt: '2026-08-26T09:00:00.000Z' }),
    ];
    expect(completedTodos(todos, TODAY).map((todo) => todo.id)).toEqual(['today', 'six']);
  });

  it('excludes anything finished more than seven days ago', () => {
    const todos: Todo[] = [done({ id: 'eight', completedAt: '2026-08-18T10:00:00.000Z' })];
    expect(completedTodos(todos, TODAY)).toEqual([]);
  });

  it('excludes open tasks', () => {
    expect(completedTodos([open({ id: 'live' })], TODAY)).toEqual([]);
  });

  it('includes a task completed just after local midnight on the boundary day', () => {
    const boundary = done({
      id: 'boundary',
      completedAt: new Date(2026, 7, 20, 0, 30, 0).toISOString(),
    });
    expect(completedTodos([boundary], TODAY).map((todo) => todo.id)).toEqual(['boundary']);
  });

  it('excludes a task completed late at night the local day before the boundary', () => {
    const tooEarly = done({
      id: 'too-early',
      completedAt: new Date(2026, 7, 19, 23, 30, 0).toISOString(),
    });
    expect(completedTodos([tooEarly], TODAY)).toEqual([]);
  });
});

describe('nextOverdueAt', () => {
  it('returns the earliest future time among today timed tasks', () => {
    const todos: Todo[] = [
      open({ id: 'late', dueDate: TODAY, dueTime: '17:00' }),
      open({ id: 'soon', dueDate: TODAY, dueTime: '11:30' }),
    ];
    expect(nextOverdueAt(todos, TODAY, '09:00:00')).toBe('11:30:00');
  });

  it('ignores times that have already passed', () => {
    const todos: Todo[] = [open({ dueDate: TODAY, dueTime: '08:00' })];
    expect(nextOverdueAt(todos, TODAY, '09:00:00')).toBeNull();
  });

  it('ignores untimed, undated, other-day and completed tasks', () => {
    const todos: Todo[] = [
      open({ dueDate: TODAY }),
      open({ dueTime: null }),
      open({ dueDate: '2026-08-27', dueTime: '10:00' }),
      done({ dueDate: TODAY, dueTime: '23:00' }),
    ];
    expect(nextOverdueAt(todos, TODAY, '09:00:00')).toBeNull();
  });

  it('stops treating a task as upcoming at the exact whole second it is due, before groupOf turns it overdue', () => {
    const task = open({ dueDate: TODAY, dueTime: '14:00' });
    expect(groupOf(task, TODAY, '14:00:00')).toBe('Today');
    expect(nextOverdueAt([task], TODAY, '14:00:00')).toBeNull();
  });
});

describe('OVERDUE_WAKE_SLACK_MS', () => {
  it('clears the whole-second window where a task is still Today but no longer upcoming', () => {
    expect(OVERDUE_WAKE_SLACK_MS).toBeGreaterThan(1000);
  });
});

describe('msUntil', () => {
  it('measures forward from the given moment in local time', () => {
    const from = new Date(2026, 7, 26, 13, 59, 30);
    expect(msUntil('2026-08-26', '14:00:00', from)).toBe(30_000);
  });
});

describe('nextWakeDelayMs', () => {
  it('wakes for an overdue instant when it comes sooner than midnight', () => {
    const from = new Date(2026, 7, 26, 23, 0, 0);
    const todos: Todo[] = [open({ dueDate: TODAY, dueTime: '23:10' })];
    expect(nextWakeDelayMs(todos, TODAY, '23:00:00', from)).toBe(
      10 * 60_000 + OVERDUE_WAKE_SLACK_MS,
    );
  });

  it('wakes at midnight when it comes sooner than any overdue instant', () => {
    const from = new Date(2026, 7, 26, 23, 0, 0);
    const todos: Todo[] = [open({ dueDate: addDays(TODAY, 1), dueTime: '09:00' })];
    expect(nextWakeDelayMs(todos, TODAY, '23:00:00', from)).toBe(
      60 * 60_000 + OVERDUE_WAKE_SLACK_MS,
    );
  });

  it('still schedules a wake at midnight when there are no timed tasks at all', () => {
    const from = new Date(2026, 7, 26, 23, 0, 0);
    expect(nextWakeDelayMs([], TODAY, '23:00:00', from)).toBe(
      60 * 60_000 + OVERDUE_WAKE_SLACK_MS,
    );
  });
});
