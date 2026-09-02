import { describe, it, expect } from 'vitest';
import { assignHandles, emptyHandleMap } from './assistantContext';
import {
  calendarChangeParser,
  categoryIdFor,
  toEventDraft,
  toEventInput,
  type CalendarChange,
} from './calendarPlan';
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
