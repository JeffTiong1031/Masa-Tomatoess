import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from './calendarEvent';
import {
  countdownAddInput,
  countdownEditInput,
  planCountdownDelete,
  untickCountdown,
} from './countdownWrite';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    owner: 'Jeff',
    title: 'Dentist',
    date: '2026-09-13',
    timing: { kind: 'moment', startTime: '09:00' },
    notes: 'Bring card',
    countdown: true,
    categoryId: 'cat-1',
    ...overrides,
  };
}

describe('countdownAddInput', () => {
  it('creates a calendar-visible countdown event', () => {
    const input = countdownAddInput(
      { title: 'Dentist', date: '2026-09-13', time: '' },
      'Jeff',
    );
    expect(input.countdown).toBe(true);
    expect(input.owner).toBe('Jeff');
    expect(input.title).toBe('Dentist');
    expect(input.date).toBe('2026-09-13');
    expect(input.notes).toBe(null);
    expect(input.categoryId).toBe(null);
  });

  it('writes an all-day event when the time is blank', () => {
    const input = countdownAddInput(
      { title: 'Holiday', date: '2026-12-25', time: '' },
      'Rachel',
    );
    expect(input.timing).toEqual({ kind: 'allDay', endDate: null });
  });

  it('writes a timed event when a time is entered', () => {
    const input = countdownAddInput(
      { title: 'Dentist', date: '2026-09-13', time: '09:00' },
      'Jeff',
    );
    expect(input.timing).toEqual({ kind: 'moment', startTime: '09:00' });
  });
});

describe('untickCountdown', () => {
  it('clears the countdown flag and leaves the calendar event intact', () => {
    const source = event();
    const updated = untickCountdown(source);
    expect(updated.countdown).toBe(false);
    expect(updated.owner).toBe(source.owner);
    expect(updated.title).toBe(source.title);
    expect(updated.date).toBe(source.date);
    expect(updated.timing).toEqual(source.timing);
    expect(updated.notes).toBe(source.notes);
    expect(updated.categoryId).toBe(source.categoryId);
  });
});

describe('planCountdownDelete', () => {
  it('untick leaves the calendar event in place', () => {
    const source = event();
    expect(planCountdownDelete(source, 'untick')).toEqual({
      action: 'update',
      input: untickCountdown(source),
    });
  });

  it('everywhere deletes the calendar event itself', () => {
    expect(planCountdownDelete(event(), 'everywhere')).toEqual({
      action: 'delete',
      id: 'evt-1',
    });
  });

  it('cancel does nothing', () => {
    expect(planCountdownDelete(event(), 'cancel')).toEqual({ action: 'none' });
  });
});

describe('countdownEditInput', () => {
  it('updates title, date, and time on the same calendar record', () => {
    const updated = countdownEditInput(event(), {
      title: 'Flight',
      date: '2026-12-01',
      time: '18:30',
    });
    expect(updated.countdown).toBe(true);
    expect(updated.title).toBe('Flight');
    expect(updated.date).toBe('2026-12-01');
    expect(updated.timing).toEqual({ kind: 'moment', startTime: '18:30' });
    expect(updated.notes).toBe('Bring card');
    expect(updated.categoryId).toBe('cat-1');
    expect(updated.owner).toBe('Jeff');
  });

  it('turns a timed event all-day when the time is cleared', () => {
    const updated = countdownEditInput(event(), {
      title: 'Dentist',
      date: '2026-09-13',
      time: '',
    });
    expect(updated.timing).toEqual({ kind: 'allDay', endDate: null });
  });
});
