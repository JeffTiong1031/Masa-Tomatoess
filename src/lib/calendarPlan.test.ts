import { describe, it, expect } from 'vitest';
import { assignHandles, emptyHandleMap } from './assistantContext';
import {
  calendarChangeParser,
  categoryIdFor,
  clashesFor,
  describeChange,
  opWordFor,
  reconcileCalendarPlan,
  toEventDraft,
  toEventInput,
  validateCalendarPlan,
  type CalendarChange,
} from './calendarPlan';
import type { CalendarEvent } from './calendarEvent';
import type { Category } from './categories';

const TODAY = '2026-09-02';

const CATEGORIES: Category[] = [
  { id: 'c-work', name: 'Work', swatch: 1, position: 0 },
  { id: 'c-sport', name: 'Sport', swatch: 2, position: 1 },
];

const NAMES = CATEGORIES.map((category) => category.name);

const MAP = assignHandles(emptyHandleMap('e'), ['ev-1', 'ev-2']);

function wire(overrides: Record<string, unknown> = {}) {
  return {
    op: 'add',
    handle: '',
    title: 'Dentist',
    date: '2026-09-10',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
    countdown: false,
    category: '',
    ...overrides,
  };
}

const parse = calendarChangeParser(MAP, TODAY, NAMES);

describe('calendarChangeParser', () => {
  it('reads a complete add', () => {
    const result = parse(wire());
    expect(result).toEqual({
      ok: true,
      change: {
        op: 'add',
        handle: '',
        title: 'Dentist',
        date: '2026-09-10',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00',
        notes: '',
        countdown: false,
        category: '',
      },
    });
  });

  it('blanks the handle on an add even when the model sends one', () => {
    const result = parse(wire({ handle: 'e1' }));
    expect(result).toEqual({ ok: true, change: expect.objectContaining({ handle: '' }) });
  });

  it('rejects an op it does not have', () => {
    expect(parse(wire({ op: 'move' }))).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a missing field', () => {
    const raw = wire();
    delete (raw as Record<string, unknown>).notes;
    expect(parse(raw)).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a handle this conversation never issued', () => {
    expect(parse(wire({ op: 'edit', handle: 'e9' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownHandle', handle: 'e9' },
    });
  });

  it('accepts a handle it did issue', () => {
    const result = parse(wire({ op: 'edit', handle: 'e1' }));
    expect(result.ok).toBe(true);
  });

  it('blanks every end-state field on a delete', () => {
    const result = parse(wire({ op: 'delete', handle: 'e2', title: 'Dentist' }));
    expect(result).toEqual({
      ok: true,
      change: {
        op: 'delete',
        handle: 'e2',
        title: '',
        date: '',
        endDate: '',
        startTime: '',
        endTime: '',
        notes: '',
        countdown: false,
        category: '',
      },
    });
  });

  it('rejects a blank title with its own reason', () => {
    expect(parse(wire({ title: '   ' }))).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });

  it('rejects a date it cannot read and quotes it', () => {
    expect(parse(wire({ date: '10 Sept' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '10 Sept' },
    });
  });

  it('checks the end date too, not just the start', () => {
    expect(parse(wire({ startTime: '', endTime: '', endDate: '2087-09-11' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 2087 },
    });
  });

  it('rejects a start time it cannot read', () => {
    expect(parse(wire({ startTime: '9am', endTime: '' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '9am' },
    });
  });

  it('rejects a category it was never sent and names it', () => {
    expect(parse(wire({ category: 'Zumba' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownCategory', name: 'Zumba' },
    });
  });

  it('accepts a category it was sent, whatever the casing', () => {
    expect(parse(wire({ category: 'sport' })).ok).toBe(true);
  });

  it('accepts no category at all', () => {
    expect(parse(wire({ category: '' })).ok).toBe(true);
  });

  it('passes the form rejection through in the form wording', () => {
    expect(parse(wire({ startTime: '10:00', endTime: '09:00' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'The end time must be after the start.' },
    });
  });

  it('will not let a timed event run across several days', () => {
    expect(parse(wire({ endDate: '2026-09-11' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'Only all-day events can run across several days.' },
    });
  });

  it('rejects an add with no date at all, in the form wording', () => {
    expect(parse(wire({ date: '', startTime: '', endTime: '' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'Pick a date.' },
    });
  });
});

describe('categoryIdFor', () => {
  it('maps a name to its id', () => {
    expect(categoryIdFor('Sport', CATEGORIES)).toBe('c-sport');
  });

  it('ignores casing and stray spaces', () => {
    expect(categoryIdFor('  work ', CATEGORIES)).toBe('c-work');
  });

  it('gives null for no category', () => {
    expect(categoryIdFor('', CATEGORIES)).toBeNull();
  });

  it('gives null for a name it does not have', () => {
    expect(categoryIdFor('Zumba', CATEGORIES)).toBeNull();
  });
});

describe('toEventDraft and toEventInput', () => {
  const timed: CalendarChange = {
    op: 'add',
    handle: '',
    title: '  Dentist  ',
    date: '2026-09-10',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '  bring the form  ',
    countdown: true,
    category: 'Work',
  };

  it('marks a timed change as not all-day', () => {
    expect(toEventDraft(timed, 'c-work').allDay).toBe(false);
  });

  it('marks a change with no start time as all-day', () => {
    expect(toEventDraft({ ...timed, startTime: '', endTime: '' }, null).allDay).toBe(true);
  });

  it('builds the same input shape the manual form builds', () => {
    expect(toEventInput(timed, 'Jeff', 'c-work')).toEqual({
      owner: 'Jeff',
      title: 'Dentist',
      date: '2026-09-10',
      timing: { kind: 'span', startTime: '09:00', endTime: '10:00' },
      notes: 'bring the form',
      countdown: true,
      categoryId: 'c-work',
    });
  });

  it('turns empty notes into null, the way the column expects', () => {
    expect(toEventInput({ ...timed, notes: '   ' }, 'Jeff', null).notes).toBeNull();
  });

  it('carries an all-day end date into the timing', () => {
    const allDay: CalendarChange = {
      ...timed,
      startTime: '',
      endTime: '',
      endDate: '2026-09-12',
    };
    expect(toEventInput(allDay, 'Jeff', null).timing).toEqual({
      kind: 'allDay',
      endDate: '2026-09-12',
    });
  });

  it('gives an all-day event with no end date a null end date', () => {
    const allDay: CalendarChange = { ...timed, startTime: '', endTime: '', endDate: '' };
    expect(toEventInput(allDay, 'Jeff', null).timing).toEqual({ kind: 'allDay', endDate: null });
  });
});

function event(over: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    owner: 'Jeff',
    title: 'Flight',
    date: '2026-09-10',
    timing: { kind: 'span', startTime: '09:00', endTime: '11:00' },
    notes: null,
    countdown: false,
    categoryId: null,
    ...over,
  };
}

const base: CalendarChange = {
  op: 'add',
  handle: '',
  title: 'Dentist',
  date: '2026-09-10',
  endDate: '',
  startTime: '09:30',
  endTime: '10:30',
  notes: '',
  countdown: false,
  category: '',
};

describe('validateCalendarPlan', () => {
  it('passes a plan with distinct handles', () => {
    expect(
      validateCalendarPlan([
        { ...base, op: 'edit', handle: 'e1' },
        { ...base, op: 'edit', handle: 'e2' },
      ]),
    ).toBeNull();
  });

  it('passes a plan of several adds', () => {
    expect(validateCalendarPlan([base, base, base])).toBeNull();
  });

  it('rejects the same handle twice and names it', () => {
    expect(
      validateCalendarPlan([
        { ...base, op: 'edit', handle: 'e1' },
        { ...base, op: 'delete', handle: 'e1' },
      ]),
    ).toEqual({ kind: 'duplicateHandle', handle: 'e1' });
  });
});

describe('reconcileCalendarPlan', () => {
  const map = assignHandles(emptyHandleMap('e'), ['ev-1', 'ev-2']);

  it('leaves an add pending with no id', () => {
    const [planned] = reconcileCalendarPlan([base], map, []);
    expect(planned).toEqual({ change: base, id: null, outcome: 'pending', note: '' });
  });

  it('resolves an edit to the row it points at', () => {
    const change = { ...base, op: 'edit' as const, handle: 'e1' };
    const [planned] = reconcileCalendarPlan([change], map, [event({ id: 'ev-1' })]);
    expect(planned).toEqual({ change, id: 'ev-1', outcome: 'pending', note: '' });
  });

  it('marks a change stale when its row has gone', () => {
    const change = { ...base, op: 'delete' as const, handle: 'e2' };
    const [planned] = reconcileCalendarPlan([change], map, [event({ id: 'ev-1' })]);
    expect(planned.outcome).toBe('stale');
    expect(planned.id).toBeNull();
    expect(planned.note).toBe('That event was already deleted.');
  });
});

describe('clashesFor', () => {
  it('finds an overlapping span on the same day', () => {
    const found = clashesFor(base, [event({ id: 'ev-1' })], null);
    expect(found.map((row) => row.title)).toEqual(['Flight']);
  });

  it('ignores a different day', () => {
    const found = clashesFor(base, [event({ id: 'ev-1', date: '2026-09-11' })], null);
    expect(found).toEqual([]);
  });

  it('ignores spans that only touch at the edge', () => {
    const change = { ...base, startTime: '11:00', endTime: '12:00' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null)).toEqual([]);
  });

  it('treats a moment as one hour', () => {
    const moment = event({ id: 'ev-1', timing: { kind: 'moment', startTime: '09:00' } });
    const inside = { ...base, startTime: '09:30', endTime: '10:30' };
    const after = { ...base, startTime: '10:00', endTime: '11:00' };
    expect(clashesFor(inside, [moment], null).length).toBe(1);
    expect(clashesFor(after, [moment], null)).toEqual([]);
  });

  it('treats a change with no end time as one hour too', () => {
    const change = { ...base, startTime: '10:30', endTime: '' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null).length).toBe(1);
  });

  it('never clashes with an all-day event', () => {
    const allDay = event({ id: 'ev-1', timing: { kind: 'allDay', endDate: null } });
    expect(clashesFor(base, [allDay], null)).toEqual([]);
  });

  it('never reports a clash for an all-day change', () => {
    const change = { ...base, startTime: '', endTime: '' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null)).toEqual([]);
  });

  it('does not match an edit against the very row it is editing', () => {
    const change = { ...base, op: 'edit' as const, handle: 'e1' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], 'ev-1')).toEqual([]);
  });

  it('says nothing about a delete', () => {
    const change = { ...base, op: 'delete' as const, handle: 'e1' };
    expect(clashesFor(change, [event({ id: 'ev-2' })], null)).toEqual([]);
  });
});

function change(overrides: Partial<CalendarChange> = {}): CalendarChange {
  return {
    op: 'add',
    handle: '',
    title: 'Dentist',
    date: '2026-09-10',
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
    countdown: false,
    category: '',
    ...overrides,
  };
}

describe('opWordFor', () => {
  it('names an add', () => {
    expect(opWordFor(change({ op: 'add' }))).toBe('Add');
  });

  it('names an edit', () => {
    expect(opWordFor(change({ op: 'edit', handle: 'e1' }))).toBe('Change');
  });

  it('names a delete', () => {
    expect(opWordFor(change({ op: 'delete', handle: 'e1' }))).toBe('Delete');
  });
});

describe('describeChange', () => {
  it('lays out a fully populated timed event', () => {
    const described = change({
      startTime: '09:00',
      endTime: '10:00',
      category: 'Work',
      countdown: true,
    });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · 09:00–10:00 · Work · countdown');
  });

  it('shows a bare start time with no end time', () => {
    const described = change({ startTime: '09:00' });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · 09:00');
  });

  it('marks a plain all-day event', () => {
    const described = change();
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · all day');
  });

  it('marks an all-day event with an end date', () => {
    const described = change({ endDate: '2026-09-15' });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · to 2026-09-15 · all day');
  });

  it('drops the category entirely when there is none', () => {
    const described = change({ startTime: '09:00', endTime: '10:00' });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · 09:00–10:00');
  });

  it('adds the countdown flag when set', () => {
    const described = change({ startTime: '09:00', endTime: '10:00', countdown: true });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · 09:00–10:00 · countdown');
  });

  it('omits the countdown flag when clear', () => {
    const described = change({ startTime: '09:00', endTime: '10:00', countdown: false });
    expect(describeChange(described)).toBe('Dentist · 2026-09-10 · 09:00–10:00');
  });
});
