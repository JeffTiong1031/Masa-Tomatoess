import { describe, it, expect } from 'vitest';
import { toTiming, validate, type EventDraft } from './eventForm';

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: 'Dentist',
    date: '2026-08-25',
    allDay: false,
    endDate: '',
    startTime: '10:00',
    endTime: '11:00',
    notes: '',
    countdown: false,
    categoryId: null,
    ...overrides,
  };
}

describe('validate', () => {
  it('accepts a well-formed draft', () => {
    expect(validate(draft())).toBeNull();
  });

  it('rejects a blank title', () => {
    expect(validate(draft({ title: '   ' }))?.field).toBe('title');
  });

  it('rejects a missing date', () => {
    expect(validate(draft({ date: '' }))?.field).toBe('date');
  });

  it('rejects an end time before its start', () => {
    expect(validate(draft({ startTime: '11:00', endTime: '10:00' }))?.field).toBe(
      'endTime',
    );
  });

  it('rejects an end time equal to its start', () => {
    expect(validate(draft({ startTime: '10:00', endTime: '10:00' }))?.field).toBe(
      'endTime',
    );
  });

  it('rejects an end time with no start time', () => {
    expect(validate(draft({ startTime: '', endTime: '11:00' }))?.field).toBe(
      'startTime',
    );
  });

  it('accepts a start time with no end time', () => {
    expect(validate(draft({ endTime: '' }))).toBeNull();
  });

  it('accepts an all-day event with no times', () => {
    expect(
      validate(draft({ allDay: true, startTime: '', endTime: '' })),
    ).toBeNull();
  });

  it('rejects an end date before its start date', () => {
    expect(
      validate(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-24',
        }),
      )?.field,
    ).toBe('endDate');
  });

  it('accepts an end date equal to its start date', () => {
    expect(
      validate(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-25',
        }),
      ),
    ).toBeNull();
  });

  it('rejects an end date on a timed event', () => {
    expect(validate(draft({ endDate: '2026-08-26' }))?.field).toBe('endDate');
  });

  it('carries a message with every error', () => {
    expect(validate(draft({ title: '' }))?.message.length).toBeGreaterThan(0);
  });
});

describe('toTiming', () => {
  it('makes an all-day timing when there are no times', () => {
    expect(
      toTiming(draft({ allDay: true, startTime: '', endTime: '' })),
    ).toEqual({ kind: 'allDay', endDate: null });
  });

  it('carries the end date onto an all-day timing', () => {
    expect(
      toTiming(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-27',
        }),
      ),
    ).toEqual({ kind: 'allDay', endDate: '2026-08-27' });
  });

  it('makes a moment from a start time alone', () => {
    expect(toTiming(draft({ endTime: '' }))).toEqual({
      kind: 'moment',
      startTime: '10:00',
    });
  });

  it('makes a span from both times', () => {
    expect(toTiming(draft())).toEqual({
      kind: 'span',
      startTime: '10:00',
      endTime: '11:00',
    });
  });

  it('treats a blank end date as none', () => {
    expect(
      toTiming(draft({ allDay: true, startTime: '', endTime: '', endDate: '' })),
    ).toEqual({ kind: 'allDay', endDate: null });
  });
});
