import { describe, it, expect } from 'vitest';
import { assignHandles, emptyHandleMap } from './assistantContext';
import { todoChangeParser, validateTodoPlan, toDraft, reconcileTodoPlan, clashesFor, type TodoChange, type PlannedChange } from './todoPlan';
import type { OpenTodo, Todo } from './todo';

const TODAY = '2026-09-01';

const MAP = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
const parse = todoChangeParser(MAP, TODAY);

function raw(overrides: Record<string, unknown> = {}) {
  return { op: 'add', handle: '', title: 'Dentist', dueDate: '', dueTime: '', priority: false, ...overrides };
}

describe('todoChangeParser', () => {
  it('accepts an add', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '15:00', priority: true }))).toEqual({
      ok: true,
      change: { op: 'add', handle: '', title: 'Dentist', dueDate: '2026-09-12', dueTime: '15:00', priority: true },
    });
  });

  it('accepts a delete carrying only a handle', () => {
    expect(parse(raw({ op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '' }))).toEqual({
      ok: true,
      change: { op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '', priority: false },
    });
  });

  it('rejects an unknown op', () => {
    expect(parse(raw({ op: 'archive' }))).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a handle it never issued and names it', () => {
    expect(parse(raw({ op: 'delete', handle: 't99' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownHandle', handle: 't99' },
    });
  });

  it('rejects __proto__ as a handle even though it is an inherited property', () => {
    expect(parse(raw({ op: 'delete', handle: '__proto__' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownHandle', handle: '__proto__' },
    });
  });

  it('rejects an add with a blank title', () => {
    expect(parse(raw({ title: '   ' }))).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });

  it('rejects an edit with a blank title', () => {
    expect(parse(raw({ op: 'edit', handle: 't1', title: '' }))).toEqual({
      ok: false,
      reason: { kind: 'emptyTitle' },
    });
  });

  it('rejects a malformed date and names the value', () => {
    expect(parse(raw({ dueDate: '12/09/2026' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '12/09/2026' },
    });
  });

  it('rejects a malformed time and names the value', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '3pm' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '3pm' },
    });
  });

  it('rejects a year too far ahead and names it', () => {
    expect(parse(raw({ dueDate: '2087-09-12' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 2087 },
    });
  });

  it('rejects a year too far behind and names it', () => {
    expect(parse(raw({ dueDate: '0202-09-12' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 202 },
    });
  });

  it('accepts a date at the edge of the allowed range', () => {
    const result = parse(raw({ dueDate: '2031-09-01' }));
    expect(result.ok).toBe(true);
  });

  it('ignores the date fields of a complete', () => {
    const result = parse(raw({ op: 'complete', handle: 't1', title: '', dueDate: 'nonsense' }));
    expect(result.ok).toBe(true);
  });

  it('rejects an impossible date like February 30', () => {
    expect(parse(raw({ dueDate: '2026-02-30' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '2026-02-30' },
    });
  });

  it('rejects a date with an invalid month', () => {
    expect(parse(raw({ dueDate: '2026-13-01' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '2026-13-01' },
    });
  });

  it('accepts a valid leap day', () => {
    const result = parse(raw({ dueDate: '2028-02-29' }));
    expect(result.ok).toBe(true);
  });

  it('rejects an impossible time like 25:99', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '25:99' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '25:99' },
    });
  });

  it('rejects a time with invalid minutes', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '12:60' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '12:60' },
    });
  });
});

describe('validateTodoPlan', () => {
  function change(overrides: Partial<TodoChange> = {}): TodoChange {
    return { op: 'edit', handle: 't1', title: 'Dentist', dueDate: '', dueTime: '', priority: false, ...overrides };
  }

  it('accepts distinct handles', () => {
    expect(validateTodoPlan([change({ handle: 't1' }), change({ handle: 't2' })])).toBeNull();
  });

  it('accepts several adds, which carry no handle', () => {
    expect(validateTodoPlan([change({ op: 'add', handle: '' }), change({ op: 'add', handle: '' })])).toBeNull();
  });

  it('rejects the same handle twice and names it', () => {
    expect(validateTodoPlan([change({ handle: 't1' }), change({ op: 'delete', handle: 't1' })])).toEqual({
      kind: 'duplicateHandle',
      handle: 't1',
    });
  });
});

describe('toDraft', () => {
  it('turns empty strings back into nulls', () => {
    const draft = toDraft(
      { op: 'add', handle: '', title: 'Dentist', dueDate: '', dueTime: '', priority: true },
      'Jeff',
    );
    expect(draft).toEqual({ owner: 'Jeff', title: 'Dentist', dueDate: null, dueTime: null, priority: true });
  });

  it('keeps a date and time when given', () => {
    const draft = toDraft(
      { op: 'add', handle: '', title: 'Dentist', dueDate: '2026-09-12', dueTime: '15:00', priority: false },
      'Rachel',
    );
    expect(draft).toEqual({
      owner: 'Rachel',
      title: 'Dentist',
      dueDate: '2026-09-12',
      dueTime: '15:00',
      priority: false,
    });
  });
});

function row(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'aaa',
    owner: 'Jeff',
    title: 'Dentist',
    dueDate: '2026-09-12',
    dueTime: null,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('reconcileTodoPlan', () => {
  it('resolves a live handle to its id and leaves it pending', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'delete', handle: 't1', title: '', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [row({ id: 'aaa' })],
    );
    expect(planned[0].id).toBe('aaa');
    expect(planned[0].outcome).toBe('pending');
  });

  it('marks a change stale when its row has gone', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [row({ id: 'aaa' })],
    );
    expect(planned[0].outcome).toBe('stale');
    expect(planned[0].note).toBe('That task was already deleted.');
  });

  it('leaves an add pending with no id', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'add', handle: '', title: 'New', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [],
    );
    expect(planned[0]).toEqual<PlannedChange>({
      change: { op: 'add', handle: '', title: 'New', dueDate: '', dueTime: '', priority: false },
      id: null,
      outcome: 'pending',
      note: '',
    });
  });
});

describe('clashesFor', () => {
  const add = (title: string, dueDate: string): TodoChange => ({
    op: 'add',
    handle: '',
    title,
    dueDate,
    dueTime: '',
    priority: false,
  });

  it('finds a task with the same title on the same day', () => {
    const found = clashesFor(add('Dentist', '2026-09-12'), [row()], null);
    expect(found.map((todo) => todo.id)).toEqual(['aaa']);
  });

  it('ignores case and surrounding spaces', () => {
    const found = clashesFor(add('  dENTIST ', '2026-09-12'), [row()], null);
    expect(found).toHaveLength(1);
  });

  it('ignores a different day', () => {
    expect(clashesFor(add('Dentist', '2026-09-13'), [row()], null)).toEqual([]);
  });

  it('ignores an undated add', () => {
    expect(clashesFor(add('Dentist', ''), [row()], null)).toEqual([]);
  });

  it('ignores a completed task', () => {
    const finished: Todo = { ...row(), done: true, completedAt: '2026-09-01T10:00:00.000Z' };
    expect(clashesFor(add('Dentist', '2026-09-12'), [finished], null)).toEqual([]);
  });

  it('does not flag a delete', () => {
    const change: TodoChange = { op: 'delete', handle: 't1', title: '', dueDate: '', dueTime: '', priority: false };
    expect(clashesFor(change, [row()], null)).toEqual([]);
  });

  it('does not flag an edit against the row it targets', () => {
    const change: TodoChange = {
      op: 'edit',
      handle: 't1',
      title: 'Dentist',
      dueDate: '2026-09-12',
      dueTime: '',
      priority: true,
    };
    expect(clashesFor(change, [row({ id: 'aaa' })], 'aaa')).toEqual([]);
  });

  it('flags an edit that collides with a different task', () => {
    const change: TodoChange = {
      op: 'edit',
      handle: 't1',
      title: 'Dentist',
      dueDate: '2026-09-12',
      dueTime: '',
      priority: false,
    };
    const rows = [row({ id: 'aaa' }), row({ id: 'bbb' })];
    expect(clashesFor(change, rows, 'aaa').map((t) => t.id)).toEqual(['bbb']);
  });

  it('still flags an add with no row to exclude', () => {
    expect(clashesFor(add('Dentist', '2026-09-12'), [row()], null)).toHaveLength(1);
  });
});
