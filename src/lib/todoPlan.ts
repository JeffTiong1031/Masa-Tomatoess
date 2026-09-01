import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import type { TodoDraft } from './todo';
import type { UserName } from './identity';

export const YEAR_RANGE = 5;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

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

function dateProblem(value: string, today: string): Reason | null {
  if (value === '') return null;
  if (!DATE_PATTERN.test(value)) return { kind: 'badDate', value };

  const year = Number(value.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  if (year < thisYear - YEAR_RANGE || year > thisYear + YEAR_RANGE) {
    return { kind: 'yearOutOfRange', year };
  }
  return null;
}

function timeProblem(value: string): Reason | null {
  if (value === '') return null;
  if (!TIME_PATTERN.test(value)) return { kind: 'badTime', value };
  return null;
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
      handle: value.handle,
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
  const seen = new Set<string>();
  for (const change of changes) {
    if (change.handle === '') continue;
    if (seen.has(change.handle)) {
      return { kind: 'duplicateHandle', handle: change.handle };
    }
    seen.add(change.handle);
  }
  return null;
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
