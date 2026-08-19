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

  it('drops events already past', () => {
    const events = [event('1', 'Last month', '2026-07-01', true)];
    expect(countdownRows(events, today)).toEqual([]);
  });

  it('keeps today at zero days', () => {
    const events = [event('1', 'Today', today, true)];
    expect(countdownRows(events, today)[0].daysUntil).toBe(0);
  });

  it('never returns a negative number', () => {
    const events = [
      event('1', 'Past', '2026-01-01', true),
      event('2', 'Future', '2026-12-01', true),
    ];
    for (const row of countdownRows(events, today)) {
      expect(row.daysUntil).toBeGreaterThanOrEqual(0);
    }
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
    expect(countdownRows(events, today)[0].daysUntil).toBe(10);
  });

  it('returns nothing when nothing is ticked', () => {
    expect(countdownRows([event('1', 'Dentist', '2026-09-13', false)], today)).toEqual(
      [],
    );
  });
});
