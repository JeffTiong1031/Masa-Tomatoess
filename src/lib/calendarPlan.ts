import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import { dateProblem, timeProblem } from './assistantValidate';
import { toTiming, validate, type EventDraft } from './eventForm';
import type { EventInput } from './calendarRepo';
import type { Category } from './categories';
import type { UserName } from './identity';

export type CalendarOp = 'add' | 'edit' | 'delete';

const OPS: CalendarOp[] = ['add', 'edit', 'delete'];

const STRING_FIELDS = [
  'handle',
  'title',
  'date',
  'endDate',
  'startTime',
  'endTime',
  'notes',
  'category',
] as const;

export interface CalendarChange {
  op: CalendarOp;
  handle: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  countdown: boolean;
  category: string;
}

const BLANK = {
  title: '',
  date: '',
  endDate: '',
  startTime: '',
  endTime: '',
  notes: '',
  countdown: false,
  category: '',
};

export function toEventDraft(change: CalendarChange, categoryId: string | null): EventDraft {
  return {
    title: change.title,
    date: change.date,
    allDay: change.startTime === '',
    endDate: change.endDate,
    startTime: change.startTime,
    endTime: change.endTime,
    notes: change.notes,
    countdown: change.countdown,
    categoryId,
  };
}

export function toEventInput(
  change: CalendarChange,
  owner: UserName,
  categoryId: string | null,
): EventInput {
  const notes = change.notes.trim();
  return {
    owner,
    title: change.title.trim(),
    date: change.date,
    timing: toTiming(toEventDraft(change, categoryId)),
    notes: notes === '' ? null : notes,
    countdown: change.countdown,
    categoryId,
  };
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

export function categoryIdFor(name: string, categories: Category[]): string | null {
  if (name.trim() === '') return null;
  const wanted = normalise(name);
  const found = categories.find((category) => normalise(category.name) === wanted);
  return found === undefined ? null : found.id;
}

export function calendarChangeParser(
  map: HandleMap,
  today: string,
  categoryNames: string[],
): ChangeParser<CalendarChange> {
  const known = new Set(categoryNames.map(normalise));

  return (raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    const value = raw as Record<string, unknown>;

    if (typeof value.op !== 'string' || !OPS.includes(value.op as CalendarOp)) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    for (const field of STRING_FIELDS) {
      if (typeof value[field] !== 'string') {
        return { ok: false, reason: { kind: 'unknownKind' } };
      }
    }
    if (typeof value.countdown !== 'boolean') {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }

    const op = value.op as CalendarOp;
    const change: CalendarChange = {
      op,
      handle: op === 'add' ? '' : (value.handle as string),
      title: value.title as string,
      date: value.date as string,
      endDate: value.endDate as string,
      startTime: value.startTime as string,
      endTime: value.endTime as string,
      notes: value.notes as string,
      countdown: value.countdown,
      category: value.category as string,
    };

    if (op !== 'add' && idOf(map, change.handle) === null) {
      return { ok: false, reason: { kind: 'unknownHandle', handle: change.handle } };
    }

    if (op === 'delete') {
      return { ok: true, change: { ...change, ...BLANK } };
    }

    if (change.title.trim() === '') return { ok: false, reason: { kind: 'emptyTitle' } };

    const problems: (Reason | null)[] = [
      dateProblem(change.date, today),
      dateProblem(change.endDate, today),
      timeProblem(change.startTime),
      timeProblem(change.endTime),
    ];
    for (const problem of problems) {
      if (problem !== null) return { ok: false, reason: problem };
    }

    if (change.category !== '' && !known.has(normalise(change.category))) {
      return { ok: false, reason: { kind: 'unknownCategory', name: change.category } };
    }

    const rejection = validate(toEventDraft(change, null));
    if (rejection !== null) {
      return { ok: false, reason: { kind: 'formRejection', message: rejection.message } };
    }

    return { ok: true, change };
  };
}
