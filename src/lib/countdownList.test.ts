import { describe, it, expect } from 'vitest';
import { countdownRows } from './countdownList';
import type { CalendarEvent } from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  countdown: boolean,
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown,
    categoryId: null,
  };
}

const today = '2026-08-19';

describe('countdownRows', () => {
  it('keeps only ticked events', () => {
    const events = [
      event('1', 'Anniversary', '2026-09-12', true),
      event('2', 'Dentist', '2026-09-13', false),
    ];
    expect(countdownRows(events, today).map((row) => row.id)).toEqual(['1']);
  });

  it('keeps a past ticked event as Passed', () => {
    const events = [event('1', 'Last month', '2026-07-01', true)];
    expect(countdownRows(events, today)).toEqual([
      {
        id: '1',
        title: 'Last month',
        date: '2026-07-01',
        display: 'Passed',
      },
    ]);
  });

  it('shows Today when the date is today', () => {
    const events = [event('1', 'Today', today, true)];
    expect(countdownRows(events, today)[0].display).toBe('Today');
  });

  it('uses the singular 1 day', () => {
    expect(
      countdownRows([event('1', 'Tomorrow', '2026-08-20', true)], today)[0]
        .display,
    ).toBe('1 day');
  });

  it('orders soonest first', () => {
    const events = [
      event('1', 'Later', '2026-11-03', true),
      event('2', 'Sooner', '2026-09-12', true),
    ];
    expect(countdownRows(events, today).map((row) => row.id)).toEqual(['2', '1']);
  });

  it('counts the days between', () => {
    const events = [event('1', 'Anniversary', '2026-08-29', true)];
    expect(countdownRows(events, today)[0].display).toBe('10 days');
  });

  it('returns nothing when nothing is ticked', () => {
    expect(countdownRows([event('1', 'Dentist', '2026-09-13', false)], today)).toEqual(
      [],
    );
  });
});
