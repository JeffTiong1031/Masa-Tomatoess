import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import type { Todo, TodoDraft } from './todo';
import type { UserName } from './identity';
import type { Planned } from './assistantRun';
import { dateProblem, duplicateHandleIn, timeProblem, YEAR_RANGE } from './assistantValidate';

export { YEAR_RANGE };

export type TodoOp = 'add' | 'edit' | 'complete' | 'reopen' | 'delete';

const OPS: TodoOp[] = ['add', 'edit', 'complete', 'reopen', 'delete'];
const END_STATE_OPS: TodoOp[] = ['add', 'edit'];

export interface TodoChange {
  op: TodoOp;
  handle: string;
  title: string;
  dueDate: string;
  dueTime: string;
  priority: boolean;
}


export function todoChangeParser(map: HandleMap, today: string): ChangeParser<TodoChange> {
  return (raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    const value = raw as Record<string, unknown>;

    if (typeof value.op !== 'string' || !OPS.includes(value.op as TodoOp)) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    if (typeof value.handle !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.title !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.dueDate !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.dueTime !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.priority !== 'boolean') return { ok: false, reason: { kind: 'unknownKind' } };

    const op = value.op as TodoOp;
    const change: TodoChange = {
      op,
      handle: op === 'add' ? '' : value.handle,
      title: value.title,
      dueDate: value.dueDate,
      dueTime: value.dueTime,
      priority: value.priority,
    };

    if (op !== 'add' && idOf(map, change.handle) === null) {
      return { ok: false, reason: { kind: 'unknownHandle', handle: change.handle } };
    }

    if (!END_STATE_OPS.includes(op)) {
      return { ok: true, change: { ...change, title: '', dueDate: '', dueTime: '', priority: false } };
    }

    if (change.title.trim() === '') return { ok: false, reason: { kind: 'emptyTitle' } };

    const badDate = dateProblem(change.dueDate, today);
    if (badDate !== null) return { ok: false, reason: badDate };

    const badTime = timeProblem(change.dueTime);
    if (badTime !== null) return { ok: false, reason: badTime };

    return { ok: true, change };
  };
}

export function validateTodoPlan(changes: TodoChange[]): Reason | null {
  return duplicateHandleIn(changes);
}

export function toDraft(change: TodoChange, owner: UserName): TodoDraft {
  return {
    owner,
    title: change.title,
    dueDate: change.dueDate === '' ? null : change.dueDate,
    dueTime: change.dueTime === '' ? null : change.dueTime,
    priority: change.priority,
  };
}

export type PlannedChange = Planned<TodoChange>;

export function reconcileTodoPlan(
  changes: TodoChange[],
  map: HandleMap,
  rows: Todo[],
): PlannedChange[] {
  const live = new Set(rows.map((todo) => todo.id));

  return changes.map((change) => {
    if (change.op === 'add') {
      return { change, id: null, outcome: 'pending', note: '' };
    }

    const id = idOf(map, change.handle);
    if (id === null || !live.has(id)) {
      return { change, id: null, outcome: 'stale', note: 'That task was already deleted.' };
    }

    return { change, id, outcome: 'pending', note: '' };
  });
}

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function clashesFor(change: TodoChange, rows: Todo[], excludeId: string | null): Todo[] {
  if (!END_STATE_OPS.includes(change.op)) return [];
  if (change.dueDate === '') return [];

  return rows.filter(
    (todo) =>
      todo.id !== excludeId &&
      !todo.done &&
      todo.dueDate === change.dueDate &&
      sameTitle(todo.title, change.title),
  );
}
