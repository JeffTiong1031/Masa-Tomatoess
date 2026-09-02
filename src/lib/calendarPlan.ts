import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import { dateProblem, duplicateHandleIn, timeProblem } from './assistantValidate';
import { monthOf } from './dates';
import { toTiming, validate, type EventDraft } from './eventForm';
import type { EventInput } from './calendarRepo';
import type { Category } from './categories';
import type { UserName } from './identity';
import type { Planned } from './assistantRun';
import type { CalendarEvent, EventTiming } from './calendarEvent';

export type CalendarOp = 'add' | 'edit' | 'delete';

const OPS: CalendarOp[] = ['add', 'edit', 'delete'];

const OP_WORDS: Record<CalendarOp, string> = {
  add: 'Add',
  edit: 'Change',
  delete: 'Delete',
};

export function opWordFor(change: CalendarChange): string {
  return OP_WORDS[change.op];
}

export function clashNoteFor(title: string): string {
  return `You already have “${title}” at that time.`;
}

export function describeChange(change: CalendarChange): string {
  const parts = [change.title];
  if (change.date !== '') parts.push(change.date);
  if (change.endDate !== '') parts.push(`to ${change.endDate}`);
  if (change.startTime !== '') {
    parts.push(change.endTime === '' ? change.startTime : `${change.startTime}–${change.endTime}`);
  }
  if (change.startTime === '' && change.date !== '') parts.push('all day');
  if (change.category !== '') parts.push(change.category);
  if (change.countdown) parts.push('countdown');
  return parts.join(' · ');
}

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

export function outsideNoteFor(change: CalendarChange, month: string): string {
  if (change.op === 'delete' || change.date === '') return '';
  return monthOf(change.date) === month ? '' : "that's outside the months you're looking at";
}

export const MOMENT_MINUTES = 60;

export function validateCalendarPlan(changes: CalendarChange[]): Reason | null {
  return duplicateHandleIn(changes);
}

export type PlannedEvent = Planned<CalendarChange>;

export function reconcileCalendarPlan(
  changes: CalendarChange[],
  map: HandleMap,
  rows: CalendarEvent[],
): PlannedEvent[] {
  const live = new Set(rows.map((row) => row.id));

  return changes.map((change) => {
    if (change.op === 'add') {
      return { change, id: null, outcome: 'pending', note: '' };
    }

    const id = idOf(map, change.handle);
    if (id === null || !live.has(id)) {
      return { change, id: null, outcome: 'stale', note: 'That event was already deleted.' };
    }

    return { change, id, outcome: 'pending', note: '' };
  });
}

interface Span {
  from: number;
  to: number;
}

function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

function spanOfTiming(timing: EventTiming): Span | null {
  if (timing.kind === 'allDay') return null;
  const from = minutesOf(timing.startTime);
  if (timing.kind === 'moment') return { from, to: from + MOMENT_MINUTES };
  return { from, to: minutesOf(timing.endTime) };
}

function spanOfChange(change: CalendarChange): Span | null {
  if (change.startTime === '') return null;
  const from = minutesOf(change.startTime);
  if (change.endTime === '') return { from, to: from + MOMENT_MINUTES };
  return { from, to: minutesOf(change.endTime) };
}

function overlaps(a: Span, b: Span): boolean {
  return a.from < b.to && b.from < a.to;
}

export function clashesFor(
  change: CalendarChange,
  rows: CalendarEvent[],
  excludeId: string | null,
): CalendarEvent[] {
  if (change.op === 'delete') return [];

  const span = spanOfChange(change);
  if (span === null) return [];

  return rows.filter((row) => {
    if (row.id === excludeId) return false;
    if (row.date !== change.date) return false;
    const other = spanOfTiming(row.timing);
    return other !== null && overlaps(span, other);
  });
}
